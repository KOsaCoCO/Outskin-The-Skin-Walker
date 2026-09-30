// =============================================================
// BODY DATA — body-part geometry + saved-drawing storage
// -------------------------------------------------------------
// The single source of truth for what a "body panel" (head / torso /
// arm / legs) looks like: which named regions ("blocks") it has,
// where each one sits (as a fraction of its own canvas), and which
// localStorage key its drawing is saved under.
//
// Every region is its own isolated block: saving a panel crops ONLY
// the pixels inside each region's own square out of the drawing
// canvas — nothing outside that square is ever included. There is
// deliberately no separate "whole part" capture spanning the entire
// canvas anymore. That used to exist (one big background image
// composited underneath the smaller block crops), but it caused the
// same drawing to visibly duplicate across every block once
// mirrored/composited — this way each block is a clean, independent
// sprite ("blocky art per body part").
//
// A region with "mirror: true" has an unseen twin on the opposite
// side that is never drawn separately — it's always the SAME saved
// image, shown flipped. That twin only exists at render time (see
// renderComposite() below); there is no separate storage key for it.
//
// "outline" is a panel's own decorative bounding box (e.g. the
// square edge of the head) — shown as a guide for the player to draw
// within, but it is NOT captured or saved; it exists purely so the
// player can see where the part's silhouette should sit.
//
// No dependencies on any other file — Design Minigame.js reads this
// data to build guides + navigation, Paint Tool.js never touches it.
// =============================================================

window.BodyData = (function () {
    "use strict";

    const STORAGE_PREFIX = "bodyDrawing_";

    // Every saved drawing is named "<part>_<id>". The id is always 1
    // here — this prototype keeps exactly one current drawing per
    // region rather than a version history, but the "_<number>"
    // naming leaves room for that later without renaming anything.
    const PANELS = {
        head: {
            title: "Head",
            outline: { x: 0, y: 0, w: 1, h: 1 },
            regions: [
                { key: "eye", storageKey: "eye_1", x: 0.20, y: 0.30, w: 0.20, h: 0.14, mirror: true },
                { key: "nose", storageKey: "nose_1", x: 0.42, y: 0.46, w: 0.16, h: 0.20 },
                { key: "mouth", storageKey: "mouth_1", x: 0.32, y: 0.68, w: 0.36, h: 0.14 },
                { key: "ear", storageKey: "ear_1", x: 0.02, y: 0.34, w: 0.14, h: 0.28, mirror: true }
            ]
        },
        torso: {
            title: "Torso",
            outline: { x: 0, y: 0, w: 1, h: 1 },
            regions: [
                { key: "torso", storageKey: "torso_1", x: 0, y: 0, w: 1, h: 1 }
            ]
        },
        arm: {
            title: "Arm",
            // Shared by BOTH t-pose arm slots — there is only ever one
            // arm drawing; the opposite arm just displays it flipped.
            outline: { x: 0, y: 0, w: 1, h: 1 },
            regions: [
                { key: "upperArm", storageKey: "upper_arm_1", x: 0.04, y: 0.15, w: 0.28, h: 0.70 },
                { key: "forearm", storageKey: "forearm_1", x: 0.36, y: 0.15, w: 0.28, h: 0.70 },
                { key: "hand", storageKey: "hand_1", x: 0.68, y: 0.15, w: 0.28, h: 0.70 }
            ]
        },
        legs: {
            title: "Legs",
            outline: { x: 0, y: 0, w: 1, h: 1 },
            regions: [
                { key: "upperLeg", storageKey: "upper_leg_1", x: 0.10, y: 0.06, w: 0.35, h: 0.34, mirror: true },
                { key: "lowerLeg", storageKey: "lower_leg_1", x: 0.10, y: 0.44, w: 0.35, h: 0.34, mirror: true },
                { key: "foot", storageKey: "foot_1", x: 0.10, y: 0.82, w: 0.35, h: 0.14, mirror: true }
            ]
        }
    };

    function getDrawing(storageKey) {
        return window.localStorage.getItem(STORAGE_PREFIX + storageKey);
    }

    function saveDrawing(storageKey, dataUrl) {
        window.localStorage.setItem(STORAGE_PREFIX + storageKey, dataUrl);
    }

    // ---- Has every region of ONE panel been drawn? ----
    // Used for a t-pose cell's own "done" checkmark.
    function isPanelDone(panelName) {
        return PANELS[panelName].regions.every(function (region) {
            return Boolean(getDrawing(region.storageKey));
        });
    }

    // ---- Has every region of EVERY panel been drawn? ----
    // The "THIS IS ME" gate.
    function isFullyDrawn() {
        return Object.keys(PANELS).every(isPanelDone);
    }

    // ---- Clear every saved body drawing (used by the main menu's
    //      "Reset Game" button) ----
    function clearAllDrawings() {
        const keysToRemove = [];
        for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && key.indexOf(STORAGE_PREFIX) === 0) keysToRemove.push(key);
        }
        keysToRemove.forEach(function (key) { window.localStorage.removeItem(key); });
    }

    // ---- Composite a panel's saved drawings into a container ----
    // Renders one <img> per region that actually has a saved drawing
    // (regions never drawn yet are simply skipped), positioned/sized
    // by that region's fractional box — this is what "scales the
    // drawing to fit the body container" in practice. A region with
    // mirror:true also gets its flipped twin rendered on the other
    // side.
    //
    // mirrorWhole flips the ENTIRE composite (used to show the same
    // "arm" drawing on the opposite arm) — that has to flip BOTH the
    // block's drawn content (via CSS transform) AND its X position,
    // or the blocks keep their original left-to-right order while
    // only their pixels mirror in place. That was a real bug here:
    // upperArm/forearm/hand stayed in the same slots on both arms,
    // so the mirrored arm showed its hand nearest the body and its
    // upper arm farthest out — backwards. Flipping position too puts
    // "hand" at the outer edge and "upperArm" nearest the torso on
    // BOTH sides, which is what "mirrored" actually needs to mean.
    function renderComposite(containerEl, panelName, mirrorWhole) {
        containerEl.innerHTML = "";
        const panel = PANELS[panelName];
        panel.regions.forEach(function (region) {
            // The block itself, in its normal position unless the
            // whole composite is mirrored (arm's opposite side).
            const ownX = mirrorWhole ? (1 - region.x - region.w) : region.x;
            addImageIfDrawn(containerEl, region.storageKey, ownX, region.y, region.w, region.h, mirrorWhole);

            if (region.mirror) {
                // This region's own mirrored twin (e.g. the other
                // eye/ear/leg side) — independent of mirrorWhole,
                // which is why its flip is the OPPOSITE of ownX's.
                const twinX = mirrorWhole ? region.x : (1 - region.x - region.w);
                addImageIfDrawn(containerEl, region.storageKey, twinX, region.y, region.w, region.h, !mirrorWhole);
            }
        });
    }

    function addImageIfDrawn(containerEl, storageKey, x, y, w, h, flip) {
        const dataUrl = getDrawing(storageKey);
        if (!dataUrl) return;

        const img = document.createElement("img");
        img.src = dataUrl;
        img.className = "composite-part";
        img.style.left = (x * 100) + "%";
        img.style.top = (y * 100) + "%";
        img.style.width = (w * 100) + "%";
        img.style.height = (h * 100) + "%";
        if (flip) img.style.transform = "scaleX(-1)";

        containerEl.appendChild(img);
    }

    return {
        PANELS: PANELS,
        getDrawing: getDrawing,
        saveDrawing: saveDrawing,
        isPanelDone: isPanelDone,
        isFullyDrawn: isFullyDrawn,
        clearAllDrawings: clearAllDrawings,
        renderComposite: renderComposite
    };
})();
