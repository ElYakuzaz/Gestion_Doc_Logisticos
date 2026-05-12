// ------------------------------------------------------------------------------------------------------------
// In-memory store for each entry's status.
// Provides functions to update and retrieve UI display state.
// ------------------------------------------------------------------------------------------------------------

const entryState = {};

// Updates stored state for an entry
export function updateEntryState(id, data) {
    entryState[id] = data;
}

// Returns HTML representation of entry state
export function getEntryState(id) {

    const state = entryState[id];

    if (!state) return `<div>Waiting...</div>`;

    if (state.type === "stage") {
        return `<div>${state.msg}</div>`;
    }

    if (state.type === "progress") {
        return `
            <div style="color:#3b82f6;">
                Processing ${state.current}/${state.total}
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
        return `<div style="color:#22c55e;">Completed ✔</div>`;
    }

    return `<div>Waiting...</div>`;
}