// ------------------------------------------------------------------------------------------------------------
// Updates entry status in UI (stage, progress, error, done).
// Syncs DOM updates with internal state and triggers UI refresh.
// ------------------------------------------------------------------------------------------------------------

import { updateEntryState } from "./entryState.js";
import { refreshPagination } from "./paginacion.js";

let refreshTimeout;

// Debounced UI refresh to avoid excessive re-rendering
function safeRefresh() {
    clearTimeout(refreshTimeout);

    refreshTimeout = setTimeout(() => {
        refreshPagination();
    }, 100);
}

// Updates DOM + internal state for an entry
function updateDOM(id, html, rawStatus) {
    const el = $(`#entry-${id} .status`);

    if (el.length) {
        el.html(html);
    }

    // guardar estado en memoria
    updateEntryState(id, rawStatus);

    // refresh controlado (NO spam render)
    safeRefresh();
}

// Sets a simple stage message (e.g. "Searching...")
export function setEntryStage(id, msg) {
    updateDOM(id, `<div>${msg}</div>`, {
        type: "stage",
        msg
    });
}

// Updates progress display (document processing)
export function setEntryProgress(id, entry, fileId, current, total, docId) {
    updateDOM(id, `
        <div style="color:#3b82f6;">
            Processing ${current}/${total}
        </div>
        <div style="color:#9ca3af;">
            Doc: ${docId}
        </div>
    `, {
        type: "progress",
        current,
        total,
        docId
    });
}

// Displays error message for entry
export function setEntryError(id, msg) {
    updateDOM(id, `<div style="color:red;">${msg}</div>`, {
        type: "error",
        msg
    });
}

// Marks entry as completed
export function setEntryDone(id) {
    updateDOM(id, `<div style="color:#22c55e;">Completed ✔</div>`, {
        type: "done"
    });
}