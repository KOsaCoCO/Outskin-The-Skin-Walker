// =============================================================
// Skin-Walker Game — PAGE CONTROLLER
// -------------------------------------------------------------
// This file is deliberately thin. It does not know HOW the intro
// text fades or HOW the drawing panel works — it just:
//   1. Shows a random monster picture on load.
//   2. Starts Stage 1 (Intro Sequence.js).
//   3. When Stage 1 finishes, starts Stage 2 (Design Minigame.js).
//   4. When Stage 2 finishes ("THIS IS ME"), stops here — this is
//      as far as the prototype goes for now.
// =============================================================

(function () {
    "use strict";

    // Reuses the monster pictures already made for the card game —
    // no new art needed. The "../" goes up one folder (out of
    // "Skin-Walker Game") before going into "Start Game/images".
    const MONSTER_IMAGES = [
        "../Start Game/images/monster_1.png",
        "../Start Game/images/monster_2.png",
        "../Start Game/images/monster_3.png",
    ];

    function showRandomMonster() {
        const monsterImageEl = document.getElementById("monster-image");
        if (!monsterImageEl) return;
        const randomIndex = Math.floor(Math.random() * MONSTER_IMAGES.length);
        monsterImageEl.src = MONSTER_IMAGES[randomIndex];
    }

    function startStage2() {
        const monsterWrapEl = document.getElementById("monster-wrap");
        window.DesignMinigame.start(monsterWrapEl, function () {
            // Prototype ends here once "THIS IS ME" completes.
            console.log("Design minigame complete — prototype ends here.");
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        showRandomMonster();

        if (window.IntroSequence) {
            window.IntroSequence.start(startStage2);
        }
    });

})();
