// ------------------------------------------------------------------------------------------------------------
// Updates entry status in UI (stage, progress, error, done).
// Syncs DOM updates with internal state without full page refresh.
// ------------------------------------------------------------------------------------------------------------

import { updateEntryState } from "./entryState.js";

// Store pending updates to batch them
let pendingUpdates = new Map();
let updateScheduled = false;

// Direct DOM update without pagination refresh
function updateDOMDirect(id, html, rawStatus) {
    // Find the status element for this specific entry
    const statusEl = $(`#entry-${id} .status`);
    
    if (statusEl.length) {
        // Update just this entry's status without touching anything else
        statusEl.html(html);
    }
    
    // Update memory state
    updateEntryState(id, rawStatus, true); // skip UI update to avoid recursion
}

// Batch multiple updates that happen in the same frame
function scheduleUpdate(id, html, rawStatus) {
    pendingUpdates.set(id, { html, rawStatus });
    
    if (!updateScheduled) {
        updateScheduled = true;
        requestAnimationFrame(() => {
            // Apply all pending updates at once
            for (const [entryId, data] of pendingUpdates) {
                const statusEl = $(`#entry-${entryId} .status`);
                if (statusEl.length) {
                    statusEl.html(data.html);
                }
                updateEntryState(entryId, data.rawStatus, true);
            }
            pendingUpdates.clear();
            updateScheduled = false;
        });
    }
}

// Updates DOM + internal state for an entry (optimized)
function updateDOM(id, html, rawStatus) {
    // Direct update without any pagination refresh
    // This preserves hover states because we're not replacing parent elements
    const statusEl = $(`#entry-${id} .status`);
    
    if (statusEl.length) {
        statusEl.html(html);
    } else {
        // If element doesn't exist yet, use the scheduled approach
        scheduleUpdate(id, html, rawStatus);
    }
    
    // Update memory state (skip UI refresh to prevent loops)
    updateEntryState(id, rawStatus, true);
}

// Sets a simple stage message (e.g. "Searching...")
export function setEntryStage(id, msg, index = null) {
    const displayMsg = index !== null ? `${index}. ${msg}` : msg;
    updateDOM(id, `<div>${displayMsg}</div>`, {
        type: "stage",
        msg: displayMsg
    });
}

// Updates progress display (document processing)
export function setEntryProgress(id, entry, fileId, current, total, docId, index = null) {
    const displayPrefix = index !== null ? `${index}. ` : '';
    updateDOM(id, `
        <div style="color:#3b82f6;">
            ${displayPrefix}Processing ${current}/${total}
        </div>
        <div style="color:#9ca3af;">
            Doc: ${docId}
        </div>
    `, {
        type: "progress",
        current,
        total,
        docId,
        entryIndex: index
    });
}

// Displays error message for entry
export function setEntryError(id, msg, index = null) {
    const displayMsg = index !== null ? `${index}. ${msg}` : msg;
    updateDOM(id, `<div style="color:red;">${displayMsg}</div>`, {
        type: "error",
        msg: displayMsg
    });
}

// Marks entry as completed
export function setEntryDone(id, index = null) {
    const displayMsg = index !== null ? `Completed ✔` : "Completed ✔";
    updateDOM(id, `<div style="color:#22c55e;">${displayMsg}</div>`, {
        type: "done",
        msg: displayMsg
    });
}

// Optional: Force a full refresh only when needed (e.g., page change)
export function forceFullRefresh() {
    // This would only be called when changing pages, not during updates
    if (typeof refreshPagination !== 'undefined') {
        refreshPagination();
    }
}