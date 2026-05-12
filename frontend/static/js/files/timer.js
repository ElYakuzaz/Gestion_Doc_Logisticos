// ------------------------------------------------------------------------------------------------------------
// Handles real-time timer for batch processing.
// Provides functions to start, stop, and reset a live timer displayed in the UI.
// ------------------------------------------------------------------------------------------------------------

let timerInterval = null;
let startTime = 0;

/**
 * Starts the timer and displays it above #output
 */
export function startTimer() {

    startTime = performance.now();

    // Create timer UI if it doesn't exist
    if (!$("#timer").length) {
        $("#output").before(`
            <div id="timer" style="font-size:18px; font-weight:bold; margin-bottom:10px;">
                ⏱ Time: 0m 0s
            </div>
        `);
    }

    // Reset display
    $("#timer").text("⏱ Time: 0m 0s");

    // Start interval
    timerInterval = setInterval(() => {

        const now = performance.now();
        const elapsed = now - startTime;

        const seconds = Math.floor((elapsed / 1000) % 60);
        const minutes = Math.floor((elapsed / (1000 * 60)) % 60);

        $("#timer").text(`⏱ Time: ${minutes}m ${seconds}s`);

    }, 1000);
}

/**
 * Stops the timer
 */
export function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/**
 * Resets and removes timer from UI (optional)
 */
export function resetTimer() {
    stopTimer();
    $("#timer").remove();
}