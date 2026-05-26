// ------------------------------------------------------------------------------------------------------------
// Updates entry status in UI (stage, progress, error, done).
// Syncs DOM updates with internal state without full page refresh.
// Now only updates the specific entry and stats, never triggers full grid re-render.
// ------------------------------------------------------------------------------------------------------------

import { updateEntryState } from "./entryState.js";

// Store pending updates to batch them
let pendingUpdates = new Map();
let updateScheduled = false;

// Helper to get current status type for change detection
function getStatusTypeFromState(state) {
    if (!state) return "pending";
    if (state.type === "done") return "completed";
    if (state.type === "error") return "failed";
    if (state.type === "stage" || state.type === "progress") return "processing";
    return "pending";
}

// Update a single entry and notify about type change if needed
function updateEntryAndNotify(id, rawStatus) {
    const oldState = window.getRawEntryState ? window.getRawEntryState(id) : null;
    const oldType = getStatusTypeFromState(oldState);
    const newType = getStatusTypeFromState(rawStatus);
    
    // Update memory state
    updateEntryState(id, rawStatus, true);
    
    // Update UI in place
    if (window.updateSingleEntry) {
        window.updateSingleEntry(id);
    }
    
    // Update stats panel (counts may change)
    if (window.updateStatsOnly) {
        window.updateStatsOnly();
    }
    
    // If type changed and we have a callback, notify
    if (oldType !== newType && window.onStatusTypeChange) {
        window.onStatusTypeChange(id, oldType, newType);
    }
}

// Direct DOM update without pagination refresh
function updateDOMDirect(id, html, rawStatus) {
    const statusEl = $(`#entry-${id} .status`);
    if (statusEl.length) {
        statusEl.html(html);
    }
    updateEntryAndNotify(id, rawStatus);
}

// Batch multiple updates that happen in the same frame
function scheduleUpdate(id, html, rawStatus) {
    pendingUpdates.set(id, { html, rawStatus });
    if (!updateScheduled) {
        updateScheduled = true;
        requestAnimationFrame(() => {
            for (const [entryId, data] of pendingUpdates) {
                const statusEl = $(`#entry-${entryId} .status`);
                if (statusEl.length) statusEl.html(data.html);
                updateEntryAndNotify(entryId, data.rawStatus);
            }
            pendingUpdates.clear();
            updateScheduled = false;
        });
    }
}

function updateDOM(id, html, rawStatus) {
    const statusEl = $(`#entry-${id} .status`);
    if (statusEl.length) {
        statusEl.html(html);
        updateEntryAndNotify(id, rawStatus);
    } else {
        scheduleUpdate(id, html, rawStatus);
    }
}

export function setEntryStage(id, msg, index = null) {
    const displayMsg = index !== null ? `${index}. ${msg}` : msg;
    updateDOM(id, `<div>${displayMsg}</div>`, {
        type: "stage",
        msg: displayMsg
    });
}

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

export function setEntryError(id, msg, index = null) {
    const displayMsg = index !== null ? `${index}. ${msg}` : msg;
    updateDOM(id, `<div style="color:red;">${displayMsg}</div>`, {
        type: "error",
        msg: displayMsg
    });
}

export function setEntryDone(id, index = null) {
    const displayMsg = index !== null ? `Completed ✔` : "Completed ✔";
    updateDOM(id, `<div style="color:#22c55e;">${displayMsg}</div>`, {
        type: "done",
        msg: displayMsg
    });
}

// Forced full refresh – now only updates stats and ensures UI consistency (rarely needed)
export function forceFullRefresh() {
    if (window.updateStatsOnly) window.updateStatsOnly();
    if (window.updateSingleEntry && typeof window.updateAllEntries === 'undefined') {
        // Optionally refresh only visible entries
    }
}