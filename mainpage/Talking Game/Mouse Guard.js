// =============================================================
// MOUSE GUARD — cursor mode switcher
// -------------------------------------------------------------
// A small guardrail around the page's cursor: only ever one of
// two modes is active at a time.
//   "regular" (default) — normal cursor, used during Stage 1
//                          (Intro Sequence) and everywhere else.
//   "paint"              — the drawing cursor, used ONLY while
//                          Stage 2's canvas panel is open. Turned
//                          on by Design Minigame.js right when the
//                          panel appears, and turned back off the
//                          moment it closes (THIS IS ME).
// No dependencies on any other file — just DOM + CSS class
// toggling. See "Mouse Guard.css" for what each mode looks like.
// =============================================================

window.MouseGuard = (function () {
    "use strict";

    const PAINT_MODE_CLASS = "cursor-mode-paint";

    return {
        // mode: "regular" | "paint"
        setMode: function (mode) {
            document.body.classList.toggle(PAINT_MODE_CLASS, mode === "paint");
        }
    };
})();
