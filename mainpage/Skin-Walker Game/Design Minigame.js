// =============================================================
// Stage 2 — DESIGN MINIGAME
// -------------------------------------------------------------
// Opens the "canvas" panel: a T-pose body map on the left, and a
// drawing panel on the right, powered by Paint Tool.js. Depends
// on Body Data.js (region geometry + storage) and Paint Tool.js
// (the actual drawing) being loaded first.
//
// Navigation, left panel:
//   T-pose (default) -> click Head/Torso/Arm(L/R)/Legs -> opens
//   that part's panel (back arrow returns to the T-pose). Clicking
//   either arm opens the SAME shared arm panel — see Body Data.js
//   for why (mirroring).
//
// Drawing, right panel:
//   Whatever panel is open, its guide outlines (from Body Data.js)
//   are shown as light-grey dashed reference boxes. The player
//   draws freely across the whole canvas. ONE "Apply to Body"
//   click crops every one of that panel's regions out of the
//   canvas and saves each to its own name (see Body Data.js).
//
// Call window.DesignMinigame.start(monsterWrapEl, onComplete)
// once, after Stage 1 finishes. onComplete fires once every region
// of every part has been saved (Body Data.js's isFullyDrawn()) and
// the player clicks "THIS IS ME".
// =============================================================

window.DesignMinigame = (function () {
    "use strict";

    // T-pose cell definition: which Body Data panel it opens, and
    // (for the shared arm panel) whether its own preview should be
    // mirrored, since "arm" is one drawing shown on two sides.
    const TPOSE_CELLS = [
        { part: "head", label: "Head", panel: "head", mirrorWhole: false, gridArea: "head" },
        { part: "armLeft", label: "Left Arm", panel: "arm", mirrorWhole: true, gridArea: "arm-left" },
        { part: "torso", label: "Torso", panel: "torso", mirrorWhole: false, gridArea: "torso" },
        { part: "armRight", label: "Right Arm", panel: "arm", mirrorWhole: false, gridArea: "arm-right" },
        { part: "legs", label: "Legs", panel: "legs", mirrorWhole: false, gridArea: "legs" }
    ];

    let monsterWrapEl = null;
    let canvasPanelEl = null;
    let tposeGridEl = null;
    let subpanelViewEl = null;
    let subpanelTitleEl = null;
    let subpanelPreviewEl = null;
    let thisIsMeBtn = null;
    let applyBtn = null;
    let onCompleteCallback = null;

    // Which Body Data panel is currently open for drawing (null = the
    // T-pose overview itself, nothing open).
    let activePanelName = null;

    // ---- Build the 5 T-pose cells (Head / Torso / Arm x2 / Legs) ----
    function buildTposeGrid() {
        tposeGridEl.innerHTML = "";
        TPOSE_CELLS.forEach(function (cell) {
            const cellEl = document.createElement("button");
            cellEl.type = "button";
            // "tpose-<panel>" carries this part's exact pixel size
            // (head 20x20, arm 40x20, torso/legs 20x40) — see
            // Design Minigame.css.
            cellEl.className = "tpose-part tpose-" + cell.panel;
            cellEl.style.gridArea = cell.gridArea;
            cellEl.dataset.part = cell.part;
            cellEl.title = cell.label;

            const labelEl = document.createElement("span");
            labelEl.className = "tpose-part-label";
            labelEl.textContent = cell.label;
            cellEl.appendChild(labelEl);

            const previewEl = document.createElement("div");
            previewEl.className = "composite-preview";
            cellEl.appendChild(previewEl);

            cellEl.addEventListener("click", function () {
                openPanel(cell.panel, cell.label);
            });

            tposeGridEl.appendChild(cellEl);
        });
        refreshTposePreviews();
    }

    // ---- Redraw every t-pose cell's composited thumbnail + done-mark ----
    function refreshTposePreviews() {
        TPOSE_CELLS.forEach(function (cell) {
            const cellEl = tposeGridEl.querySelector('[data-part="' + cell.part + '"]');
            if (!cellEl) return;
            const previewEl = cellEl.querySelector(".composite-preview");
            window.BodyData.renderComposite(previewEl, cell.panel, cell.mirrorWhole);
            cellEl.classList.toggle("done", window.BodyData.isPanelDone(cell.panel));
        });
    }

    // ---- Open one part's drawing panel (Head / Torso / Arm / Legs) ----
    function openPanel(panelName, label) {
        activePanelName = panelName;

        tposeGridEl.hidden = true;
        subpanelViewEl.hidden = false;
        applyBtn.hidden = false;
        subpanelTitleEl.textContent = label;

        // The panel always starts with a blank drawing surface — any
        // already-saved regions still live in Body Data's storage and
        // show up in the live preview below, but re-drawing here
        // starts fresh, same as the original single-part design.
        window.PaintTool.clear();
        const panelConfig = window.BodyData.PANELS[panelName];
        // The outline is a decorative reference box only (the part's
        // own silhouette edge) — it's shown as a guide but never
        // captured/saved, unlike every region in the list after it.
        const guideRects = [panelConfig.outline].concat(panelConfig.regions);
        window.PaintTool.setGuides(guideRects);

        refreshSubpanelPreview();
    }

    // ---- Refresh the open panel's own live composited preview ----
    function refreshSubpanelPreview() {
        if (!activePanelName) return;
        // The open panel's own preview is never mirrored — mirroring
        // only matters for showing the SAME arm on the opposite side,
        // which happens on the t-pose cells, not inside the panel.
        window.BodyData.renderComposite(subpanelPreviewEl, activePanelName, false);
    }

    // ---- Back arrow: return to the T-pose overview ----
    function onBackToTpose() {
        activePanelName = null;
        window.PaintTool.clearGuides();

        subpanelViewEl.hidden = true;
        applyBtn.hidden = true;
        tposeGridEl.hidden = false;
        refreshTposePreviews();
    }

    // ---- Toolbar wiring: tool buttons, color swatches, size buttons ----
    function wireToolbar() {
        const toolButtons = document.querySelectorAll("#tool-buttons .tool-btn");
        toolButtons.forEach(function (btn) {
            btn.addEventListener("click", function () {
                window.PaintTool.setTool(btn.dataset.tool);
                toolButtons.forEach(function (b) { b.classList.remove("active"); });
                btn.classList.add("active");
            });
        });
        if (toolButtons.length > 0) toolButtons[0].classList.add("active"); // default: brush

        const colorButtons = document.querySelectorAll("#color-buttons .color-btn");
        colorButtons.forEach(function (btn) {
            btn.addEventListener("click", function () {
                window.PaintTool.setColor(btn.dataset.color);
                colorButtons.forEach(function (b) { b.classList.remove("active"); });
                btn.classList.add("active");
            });
        });
        if (colorButtons.length > 0) colorButtons[0].classList.add("active"); // default: first swatch

        const sizeButtons = document.querySelectorAll("#size-buttons .size-btn");
        sizeButtons.forEach(function (btn) {
            btn.addEventListener("click", function () {
                window.PaintTool.setSize(btn.dataset.size);
                sizeButtons.forEach(function (b) { b.classList.remove("active"); });
                btn.classList.add("active");
            });
        });
        if (sizeButtons.length > 1) sizeButtons[1].classList.add("active"); // default: medium
    }

    // ---- "Apply to Body": crop + save every region of the open panel ----
    function onApplyToBody() {
        if (!activePanelName) return;

        const panel = window.BodyData.PANELS[activePanelName];
        panel.regions.forEach(function (region) {
            const dataUrl = window.PaintTool.getRegionDataURL(region.x, region.y, region.w, region.h);
            window.BodyData.saveDrawing(region.storageKey, dataUrl);
        });

        refreshSubpanelPreview();
        checkAllPartsApplied();
    }

    function checkAllPartsApplied() {
        if (!window.BodyData.isFullyDrawn()) return;
        thisIsMeBtn.hidden = false;
        void thisIsMeBtn.offsetWidth; // force reflow so the fade-in transition plays
        thisIsMeBtn.classList.add("visible");
    }

    // ---- "THIS IS ME": close the canvas, slide the monster back ----
    function onThisIsMe() {
        canvasPanelEl.classList.remove("visible");
        monsterWrapEl.classList.remove("monster-left");
        window.MouseGuard.setMode("regular");

        // Wait for the panel's own fade-out transition before
        // removing it from layout and handing control back.
        window.setTimeout(function () {
            canvasPanelEl.hidden = true;
            if (typeof onCompleteCallback === "function") {
                onCompleteCallback();
            }
        }, 600);
    }

    return {
        start: function (monsterWrapElement, onComplete) {
            monsterWrapEl = monsterWrapElement;
            canvasPanelEl = document.getElementById("design-canvas");
            tposeGridEl = document.getElementById("tpose-grid");
            subpanelViewEl = document.getElementById("subpanel-view");
            subpanelTitleEl = document.getElementById("subpanel-title");
            subpanelPreviewEl = document.getElementById("subpanel-preview");
            thisIsMeBtn = document.getElementById("this-is-me-btn");
            applyBtn = document.getElementById("apply-to-body-btn");
            onCompleteCallback = onComplete;

            monsterWrapEl.classList.add("monster-left");

            buildTposeGrid();
            wireToolbar();

            document.getElementById("panel-back-btn").addEventListener("click", onBackToTpose);
            applyBtn.addEventListener("click", onApplyToBody);
            thisIsMeBtn.addEventListener("click", onThisIsMe);

            // The panel must actually be visible (not "hidden") before
            // Paint Tool measures the canvas elements' on-screen size —
            // otherwise clientWidth/clientHeight read as 0 and it falls
            // back to the browser's default 300x150 buffer.
            canvasPanelEl.hidden = false;
            // Force reflow before adding "visible" so the fade-in transition plays.
            void canvasPanelEl.offsetWidth;
            canvasPanelEl.classList.add("visible");
            window.MouseGuard.setMode("paint");

            const drawingCanvasEl = document.getElementById("drawing-canvas");
            const guideCanvasEl = document.getElementById("guide-canvas");
            window.PaintTool.init(drawingCanvasEl, guideCanvasEl);
            window.PaintTool.clear();
        }
    };
})();
