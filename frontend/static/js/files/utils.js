// ------------------------------------------------------------------------------------------------------------
// Utility helpers.
// Currently: sanitizes strings to safe IDs (removes special chars).
// ------------------------------------------------------------------------------------------------------------

/**
 * Converts string into safe ID (removes special characters)
 * @param {string} str
 */
export function sanitize(str) {
    return String(str).replace(/[^a-zA-Z0-9]/g, "_");
}