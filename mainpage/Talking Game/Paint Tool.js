// =============================================================
// PAINT TOOL — standalone canvas drawing engine
// -------------------------------------------------------------
// Knows nothing about body parts, panels, or the rest of the
// game. Just a small MS-Paint-style tool bound to TWO stacked
// <canvas> elements of the same size:
//   - a GUIDE canvas underneath: light-grey dashed reference
//     boxes only. Never drawn on, never saved, purely visual.
//   - a DRAWING canvas on top: where the player's actual strokes
//     go, and the only one ever read back out.
//
// Usage (see Design Minigame.js for the real wiring):
//   PaintTool.init(drawingCanvasElement, guideCanvasElement);
//   PaintTool.setTool("brush" | "bucket" | "eraser");
//   PaintTool.setColor("#rrggbb");
//   PaintTool.setSize("tiny" | "medium" | "big");
//   PaintTool.setGuides([{x,y,w,h}, ...]);  // fractions 0..1
//   PaintTool.clearGuides();
//   PaintTool.clear();                      // wipes the drawing blank
//   PaintTool.getDataURL();                 // whole drawing as PNG
//   PaintTool.getRegionDataURL(x, y, w, h); // one cropped region (fractions)
//
// The drawing canvas's pixel buffer starts fully TRANSPARENT (not
// painted white) — the white look comes from the CSS background
// behind both canvases. That way a saved region only contains the
// player's actual strokes.
// =============================================================

window.PaintTool = (function () {
    "use strict";

    const SIZE_PX = {
        tiny: 3,
        medium: 8,
        big: 16
    };

    let canvas = null;
    let ctx = null;
    let guideCanvas = null;
    let guideCtx = null;

    // Remembered so guides can be redrawn after a resize.
    let currentGuideRects = [];

    let currentTool = "brush";
    let currentColor = "#1a1a1a";
    let currentSize = "medium";

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // ---- Fit both canvases' internal pixel buffers to their on-screen size ----
    function resizeCanvasesToElement() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (width === 0 || height === 0) return;

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        if (guideCanvas.width !== width || guideCanvas.height !== height) {
            guideCanvas.width = width;
            guideCanvas.height = height;
            drawGuides(); // pixel buffer was just wiped by the resize — redraw it
        }
    }

    // ---- Where the mouse is, in canvas-pixel coordinates ----
    function getCanvasPoint(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    // ---- Draw the current guide rectangles (dashed, light grey) ----
    function drawGuides() {
        guideCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
        guideCtx.save();
        guideCtx.strokeStyle = "rgba(210, 210, 210, 0.9)";
        guideCtx.lineWidth = 2;
        guideCtx.setLineDash([6, 5]);
        currentGuideRects.forEach(function (rect) {
            guideCtx.strokeRect(
                rect.x * guideCanvas.width,
                rect.y * guideCanvas.height,
                rect.w * guideCanvas.width,
                rect.h * guideCanvas.height
            );
        });
        guideCtx.restore();
    }

    // ---- Brush / eraser stroke drawing ----
    function strokeTo(x, y) {
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.lineWidth = SIZE_PX[currentSize];

        if (currentTool === "eraser") {
            // Actually clears pixels back to transparent, rather than
            // painting white over them.
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "rgba(0,0,0,1)";
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = currentColor;
        }

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();

        lastX = x;
        lastY = y;
    }

    // ---- Bucket fill (flood fill) ----
    function floodFillAt(startX, startY) {
        const width = canvas.width;
        const height = canvas.height;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const startIndex = (Math.floor(startY) * width + Math.floor(startX)) * 4;
        const targetR = data[startIndex];
        const targetG = data[startIndex + 1];
        const targetB = data[startIndex + 2];
        const targetA = data[startIndex + 3];

        const fill = hexToRgb(currentColor);

        // Already the fill color — nothing to do.
        if (targetR === fill.r && targetG === fill.g && targetB === fill.b && targetA === 255) {
            return;
        }

        function matchesTarget(index) {
            return data[index] === targetR &&
                data[index + 1] === targetG &&
                data[index + 2] === targetB &&
                data[index + 3] === targetA;
        }

        function setFillColor(index) {
            data[index] = fill.r;
            data[index + 1] = fill.g;
            data[index + 2] = fill.b;
            data[index + 3] = 255;
        }

        // Stack-based flood fill — avoids recursion depth limits on
        // large filled areas.
        const stack = [[Math.floor(startX), Math.floor(startY)]];
        while (stack.length > 0) {
            const point = stack.pop();
            const x = point[0];
            const y = point[1];
            if (x < 0 || x >= width || y < 0 || y >= height) continue;

            const index = (y * width + x) * 4;
            if (!matchesTarget(index)) continue;

            setFillColor(index);
            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }

        ctx.putImageData(imageData, 0, 0);
    }

    function hexToRgb(hex) {
        const clean = hex.replace("#", "");
        return {
            r: parseInt(clean.substring(0, 2), 16),
            g: parseInt(clean.substring(2, 4), 16),
            b: parseInt(clean.substring(4, 6), 16)
        };
    }

    // ---- Mouse event handlers ----
    function onMouseDown(event) {
        const point = getCanvasPoint(event);

        if (currentTool === "bucket") {
            floodFillAt(point.x, point.y);
            return;
        }

        isDrawing = true;
        lastX = point.x;
        lastY = point.y;
        // Draw a dot immediately, so a single click still leaves a mark.
        strokeTo(point.x, point.y);
    }

    function onMouseMove(event) {
        if (!isDrawing) return;
        const point = getCanvasPoint(event);
        strokeTo(point.x, point.y);
    }

    function onMouseUp() {
        isDrawing = false;
    }

    return {
        // ---- Setup ----
        init: function (canvasElement, guideCanvasElement) {
            canvas = canvasElement;
            ctx = canvas.getContext("2d");
            guideCanvas = guideCanvasElement;
            guideCtx = guideCanvas.getContext("2d");

            resizeCanvasesToElement();

            canvas.addEventListener("mousedown", onMouseDown);
            canvas.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
            window.addEventListener("resize", resizeCanvasesToElement);
        },

        // ---- Tool selection (called by Design Minigame.js's toolbar) ----
        setTool: function (toolName) {
            currentTool = toolName;
        },
        setColor: function (hexColor) {
            currentColor = hexColor;
        },
        setSize: function (sizeName) {
            currentSize = sizeName;
        },

        // ---- Guide overlay (visual only — never part of a saved drawing) ----
        setGuides: function (rects) {
            currentGuideRects = rects || [];
            resizeCanvasesToElement(); // guide canvas must be sized before drawing into it
            drawGuides();
        },
        clearGuides: function () {
            currentGuideRects = [];
            drawGuides();
        },

        // ---- Canvas contents ----
        clear: function () {
            resizeCanvasesToElement();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        },
        getDataURL: function () {
            return canvas.toDataURL("image/png");
        },
        // x, y, w, h are fractions (0..1) of the drawing canvas.
        getRegionDataURL: function (x, y, w, h) {
            const sx = x * canvas.width;
            const sy = y * canvas.height;
            const sw = w * canvas.width;
            const sh = h * canvas.height;

            const cropCanvas = document.createElement("canvas");
            cropCanvas.width = sw;
            cropCanvas.height = sh;
            cropCanvas.getContext("2d").drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
            return cropCanvas.toDataURL("image/png");
        }
    };
})();
