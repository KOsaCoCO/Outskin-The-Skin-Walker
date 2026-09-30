// =============================================================
// Stage 1 — INTRO SEQUENCE
// -------------------------------------------------------------
// A short scripted sequence of fading lines of text over the
// centered monster picture. No dependencies on any other file.
//
// Call window.IntroSequence.start(onComplete) once, after the
// page has loaded. It plays through STEPS in order, then calls
// onComplete() so Talking Game.js can move on to Stage 2.
//
// Two ways a step moves forward:
//   - "text" steps auto-advance after their own delay, but the
//     player can also click anywhere on the screen to skip ahead
//     immediately.
//   - "text-with-button" steps wait for the player to click the
//     button that fades in after a short delay — clicking the
//     screen does nothing on this kind of step.
// =============================================================

(function () {
    "use strict";

    const STEPS = [
        {
            type: "text",
            text: "Welcome to the studio!",
            autoAdvanceMs: 6000
        },
        {
            type: "text-with-button",
            text: "A place where we build a new “us”! Would you like to try?",
            buttonDelayMs: 2000,
            buttonText: "I want to become new!"
        },
        {
            type: "text",
            text: "Great! Let's begin, why don't you show me who you are?",
            autoAdvanceMs: 4000
        }
    ];

    let textEl = null;
    let buttonEl = null;
    let stepIndex = 0;
    let onCompleteCallback = null;

    // Timer for the current step's auto-advance / button-delay, so a
    // skip or an early button click can cancel it cleanly.
    let pendingTimer = null;

    // True only while the current step allows a screen-click to skip.
    let skippableNow = false;

    function clearPendingTimer() {
        if (pendingTimer !== null) {
            clearTimeout(pendingTimer);
            pendingTimer = null;
        }
    }

    // ---- Fade the text element to a new line (or blank) ----
    function setText(text) {
        textEl.classList.remove("visible");
        // Wait a beat for the fade-out before swapping the text and
        // fading back in, so it reads as a soft cross-fade rather
        // than an instant jump.
        window.setTimeout(function () {
            textEl.textContent = text;
            // Force reflow so the browser registers the class removal
            // above before we re-add it — otherwise the transition
            // can get skipped.
            void textEl.offsetWidth;
            textEl.classList.add("visible");
        }, 250);
    }

    function hideButton() {
        buttonEl.classList.remove("visible");
        buttonEl.hidden = true;
    }

    function showButton(label) {
        buttonEl.textContent = label;
        buttonEl.hidden = false;
        // Force reflow before adding "visible" so the fade-in transition plays.
        void buttonEl.offsetWidth;
        buttonEl.classList.add("visible");
    }

    // ---- Advance to the next step, or finish ----
    function advance() {
        clearPendingTimer();
        skippableNow = false;
        stepIndex += 1;

        if (stepIndex >= STEPS.length) {
            hideButton();
            setText("");
            if (typeof onCompleteCallback === "function") {
                onCompleteCallback();
            }
            return;
        }

        runStep(STEPS[stepIndex]);
    }

    function runStep(step) {
        hideButton();
        setText(step.text);

        if (step.type === "text") {
            skippableNow = true;
            pendingTimer = window.setTimeout(advance, step.autoAdvanceMs);
        } else if (step.type === "text-with-button") {
            skippableNow = false;
            pendingTimer = window.setTimeout(function () {
                showButton(step.buttonText);
            }, step.buttonDelayMs);
        }
    }

    // ---- Player clicked anywhere on the screen ----
    function onScreenClick(event) {
        // Ignore clicks on the button itself — that has its own
        // handler (onButtonClick) and shouldn't also trigger a skip.
        if (event.target === buttonEl) return;
        if (!skippableNow) return;
        advance();
    }

    function onButtonClick() {
        advance();
    }

    window.IntroSequence = {
        // onComplete: function called once, after the last step
        // finishes fading out.
        start: function (onComplete) {
            textEl = document.getElementById("intro-text");
            buttonEl = document.getElementById("intro-button");
            onCompleteCallback = onComplete;
            stepIndex = 0;

            document.addEventListener("click", onScreenClick);
            buttonEl.addEventListener("click", onButtonClick);

            runStep(STEPS[0]);
        }
    };

})();
