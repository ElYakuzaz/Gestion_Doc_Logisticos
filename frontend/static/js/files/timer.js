// ------------------------------------------------------------------------------------------------------------
// Handles real-time timer for batch processing.
// Provides functions to start, stop, reset, and query the live timer displayed in the UI.
// Fixed: startTimer() no longer resets the timer if it is already running (proper pause/resume).
// Added hours support – now shows Hh Mm Ss when exceeding 59 minutes.
// ------------------------------------------------------------------------------------------------------------

let timerInterval = null;
let isRunning = false;
let accumulatedElapsed = 0;   // milliseconds already counted (when paused)
let lastStartTime = 0;

/**
 * Ensures the timer display element exists in the DOM.
 * Creates it right before #output if missing.
 */
function ensureTimerElement() {
    if ($("#timer").length) return;
    $("#output").before(`
        <div id="timer" style="font-size:18px; font-weight:bold; margin-bottom:10px;">
            ⏱ Time: 0m 0s
        </div>
    `);
}

/**
 * Formats elapsed milliseconds into Hh Mm Ss or Mm Ss (if less than 1 hour).
 * @param {number} elapsedMs - Elapsed time in milliseconds
 * @returns {string} Formatted time string
 */
function formatElapsedTime(elapsedMs) {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else {
        return `${minutes}m ${seconds}s`;
    }
}

/**
 * Updates the timer display with current elapsed time.
 */
function updateTimerDisplay() {
    if (!isRunning) return;
    const now = performance.now();
    const elapsed = accumulatedElapsed + (now - lastStartTime);
    const formattedTime = formatElapsedTime(elapsed);
    $("#timer").text(`⏱ Time: ${formattedTime}`);
}

/**
 * Starts the timer from its current accumulated time.
 * If the timer is already running, this does nothing (no reset).
 */
export function startTimer() {
    if (isRunning) return;
    if (lastStartTime === 0) {
        // fresh start (or after reset)
        accumulatedElapsed = 0;
    }
    lastStartTime = performance.now();
    isRunning = true;
    ensureTimerElement();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (isRunning) updateTimerDisplay();
    }, 1000);
    updateTimerDisplay(); // immediate update
}

/**
 * Stops the timer (pauses it without resetting elapsed time).
 */
export function stopTimer() {
    if (isRunning && lastStartTime !== 0) {
        const now = performance.now();
        accumulatedElapsed += (now - lastStartTime);
        lastStartTime = 0;
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isRunning = false;
}

/**
 * Resets the timer to zero and stops it.
 */
export function resetTimer() {
    stopTimer();
    accumulatedElapsed = 0;
    lastStartTime = 0;
    isRunning = false;
    ensureTimerElement();
    $("#timer").text("⏱ Time: 0m 0s");
}

/**
 * Returns the current elapsed time in seconds (for logging or other uses).
 */
export function getElapsedTime() {
    let totalMs;
    if (isRunning && lastStartTime !== 0) {
        const now = performance.now();
        totalMs = accumulatedElapsed + (now - lastStartTime);
    } else {
        totalMs = accumulatedElapsed;
    }
    return totalMs / 1000;
}

/**
 * Returns the current elapsed time in a formatted string (Hh Mm Ss or Mm Ss).
 * Useful for logging or showing in other parts of the UI.
 */
export function getFormattedElapsedTime() {
    let totalMs;
    if (isRunning && lastStartTime !== 0) {
        const now = performance.now();
        totalMs = accumulatedElapsed + (now - lastStartTime);
    } else {
        totalMs = accumulatedElapsed;
    }
    return formatElapsedTime(totalMs);
}