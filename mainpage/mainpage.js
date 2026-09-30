// Map each menu action to its target page.
// NOTE: "rules"/"cards"/"settings" are ARCHIVED — the game is being
// remodeled around the Skin-Walker Game, so their buttons were removed
// from mainpage.html for now. Their routes are left here on purpose
// (harmless with no button pointing at them) so the old pages are one
// line away from coming back later.
//
// "start" (the old card game) is removed FOR GOOD, not archived — its
// button is gone and won't come back the same casual way the others
// might. The route is left mapped here anyway since it's harmless and
// the files themselves haven't been deleted.
const PAGES = {
    start: "Start Game/Start Game.html",
    rules: "Game Rules/Game Rules.html",
    cards: "Card Info/Card Info.html",
    settings: "Settings/Settings.html",
    talking: "Skin-Walker Game/Skin-Walker Game.html"
};

document.addEventListener("DOMContentLoaded", () => {
    const greeting = document.getElementById("greeting");
    if (greeting) {
        console.log("Page loaded — greeting element found.");
    }

    // Hook up menu buttons
    const buttons = document.querySelectorAll(".menu-btn");
    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const action = btn.dataset.action;
            if (action) handleMenuAction(action);
        });
    });

    // Reset Game — clears every saved body-design drawing from a
    // previous "Game Start" round, so the next round starts from a
    // blank body. This prefix MUST match Body Data.js's own
    // STORAGE_PREFIX exactly — there's no shared import between the
    // two files (different pages) to keep them in sync automatically.
    const resetBtn = document.getElementById("reset-game-btn");
    if (resetBtn) {
        resetBtn.addEventListener("click", handleResetGame);
    }
});

const BODY_DRAWING_STORAGE_PREFIX = "bodyDrawing_";

function handleResetGame() {
    const confirmed = window.confirm("Reset Game Start? This clears every body part you've drawn so far.");
    if (!confirmed) return;

    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.indexOf(BODY_DRAWING_STORAGE_PREFIX) === 0) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));

    window.alert("Game Start has been reset.");
}

function handleMenuAction(action) {
    const target = PAGES[action];
    if (target) {
        window.location.href = target;
    } else {
        console.log("Unknown menu action:", action);
    }
}
