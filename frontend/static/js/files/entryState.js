// ------------------------------------------------------------------------------------------------------------
// In-memory store for each entry's status.
// Provides functions to update and retrieve UI display state.
// ------------------------------------------------------------------------------------------------------------

const entryState = {};

// Updates stored state for an entry
export function updateEntryState(id, data, skipUI = false) {
    entryState[id] = data;
}

// Update transfer status for an entry
export function updateTransferState(id, status, message = "") {
    if (!entryState[id]) {
        entryState[id] = {};
    }
    entryState[id].transfer = { status, message };
}

// Get transfer status for an entry
export function getTransferState(id) {
    return entryState[id]?.transfer || null;
}

// Returns HTML representation of entry state
export function getEntryState(id) {
    const state = entryState[id];

    if (!state) return null;

    if (state.type === "stage") {
        return `<div>${state.msg}</div>`;
    }

    if (state.type === "progress") {
        const displayPrefix = state.entryIndex ? `${state.entryIndex}. ` : '';
        return `
            <div style="color:#3b82f6;">
                ${displayPrefix}Processing ${state.current}/${state.total}
            </div>
            <div style="color:#9ca3af;">
                Doc: ${state.docId}
            </div>
        `;
    }

    if (state.type === "error") {
        return `<div style="color:red;">${state.msg}</div>`;
    }

    if (state.type === "done") {
        return `<div style="color:#22c55e;">${state.msg || 'Completed ✔'}</div>`;
    }

    return null;
}

// Get raw state object
export function getRawEntryState(id) {
    return entryState[id] || null;
}