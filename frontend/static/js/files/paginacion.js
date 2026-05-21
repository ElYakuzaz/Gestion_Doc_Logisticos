// ------------------------------------------------------------------------------------------------------------
// Pagination controller for entries grid
// Handles pagination UI, rendering entries with status, and transfer status display
// ------------------------------------------------------------------------------------------------------------

import { getRawEntryState, getTransferState, updateTransferState } from "./entryState.js";
import { sanitize } from "./utils.js";

let currentPage = 1;
let itemsPerPage = 100;
let allEntries = [];
let totalPages = 0;

// Store the current batches data for re-rendering
let currentBatchesData = [];

// Escape HTML to prevent XSS
function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Get transfer status HTML
function getTransferStatusHTML(entryId) {
    const transfer = getTransferState(entryId);
    
    if (!transfer) return '';
    
    switch(transfer.status) {
        case "transferring":
            return `
                <div style="color:#f59e0b; font-size:11px; margin-top:6px; display:flex; align-items:center; gap:6px;">
                    <span class="transfer-spinner"></span> Transferring to server...
                </div>
            `;
        case "transferred":
            return `
                <div style="color:#10b981; font-size:11px; margin-top:6px; display:flex; align-items:center; gap:4px;">
                    ✓ Transferred to server
                </div>
            `;
        case "failed":
            return `
                <div style="color:#ef4444; font-size:11px; margin-top:6px;">
                    ❌ Transfer failed: ${escapeHtml(transfer.message)}
                </div>
            `;
        default:
            return '';
    }
}

// Render the entries grid with pagination
export function renderEntries(entries, page = currentPage) {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageEntries = entries.slice(start, end);
    
    const container = $("#output");
    
    if (!container.length) return;
    
    if (!entries || entries.length === 0) {
        container.html(`
            <div style="display: flex; justify-content: center; align-items: center; min-height: 150px; color: var(--text-muted);">
                No entries found. Please upload a file and click Search.
            </div>
        `);
        return;
    }
    
    let html = `
        <div class="entries-grid">
    `;
    
    for (let idx = 0; idx < pageEntries.length; idx++) {
        const entry = pageEntries[idx];
        const entryStr = String(entry);
        const sanitizedId = sanitize(entryStr);
        const entryIdDisplay = escapeHtml(entryStr);
        const globalIndex = start + idx + 1;
        const state = getRawEntryState(sanitizedId);
        const transferHtml = getTransferStatusHTML(sanitizedId);
        
        let statusHtml = '';
        
        if (state) {
            if (state.type === "stage") {
                statusHtml = `<div>${escapeHtml(state.msg)}</div>`;
            } else if (state.type === "progress") {
                const displayPrefix = state.entryIndex ? `${state.entryIndex}. ` : '';
                statusHtml = `
                    <div style="color:#3b82f6;">
                        ${displayPrefix}Processing ${state.current}/${state.total}
                    </div>
                    <div style="color:#9ca3af; font-size: 11px;">
                        Doc: ${escapeHtml(state.docId)}
                    </div>
                `;
            } else if (state.type === "error") {
                statusHtml = `<div style="color:#ef4444;">${escapeHtml(state.msg)}</div>`;
            } else if (state.type === "done") {
                statusHtml = `<div style="color:#10b981;">${escapeHtml(state.msg) || 'Completed ✔'}</div>`;
            } else {
                statusHtml = `<div style="color:#64748b;">Waiting...</div>`;
            }
        } else {
            statusHtml = `<div style="color:#64748b;">Waiting...</div>`;
        }
        
        html += `
            <div class="entry" id="entry-${sanitizedId}">
                <b>${globalIndex}. Entry: ${entryIdDisplay}</b>
                <div class="status">
                    ${statusHtml}
                </div>
                <div class="transfer-status" id="transfer-${sanitizedId}">
                    ${transferHtml}
                </div>
            </div>
        `;
    }
    
    html += `
        </div>
        <div class="pagination">
            <button id="prevPageBtn" ${page === 1 ? 'disabled' : ''}>← Previous</button>
            <span>Page ${page} of ${totalPages}</span>
            <button id="nextPageBtn" ${page === totalPages ? 'disabled' : ''}>Next →</button>
        </div>
    `;
    
    container.html(html);
    
    $("#prevPageBtn").off("click").on("click", function() {
        if (currentPage > 1) {
            goToPage(currentPage - 1);
        }
    });
    
    $("#nextPageBtn").off("click").on("click", function() {
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
    });
}

// Initialize pagination with batch data
export function initPagination(batches) {
    const allEntryIds = [];
    for (const batch of batches) {
        for (const entry of batch) {
            const entryStr = String(entry);
            if (!allEntryIds.includes(entryStr)) {
                allEntryIds.push(entryStr);
            }
        }
    }
    
    allEntries = allEntryIds;
    totalPages = Math.ceil(allEntries.length / itemsPerPage);
    currentPage = 1;
    
    renderEntries(allEntries, currentPage);
    currentBatchesData = batches;
}

// Go to a specific page
export function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderEntries(allEntries, currentPage);
}

// Refresh the current page
export function refreshPagination() {
    if (allEntries.length > 0) {
        renderEntries(allEntries, currentPage);
    }
}

// Update a single entry's status without re-rendering the whole grid
export function updateSingleEntry(entryId) {
    const entryCard = $(`#entry-${entryId}`);
    if (entryCard.length) {
        const state = getRawEntryState(entryId);
        const statusDiv = entryCard.find('.status');
        const transferHtml = getTransferStatusHTML(entryId);
        
        if (state) {
            if (state.type === "stage") {
                statusDiv.html(`<div>${escapeHtml(state.msg)}</div>`);
            } else if (state.type === "progress") {
                const displayPrefix = state.entryIndex ? `${state.entryIndex}. ` : '';
                statusDiv.html(`
                    <div style="color:#3b82f6;">
                        ${displayPrefix}Processing ${state.current}/${state.total}
                    </div>
                    <div style="color:#9ca3af; font-size: 11px;">
                        Doc: ${escapeHtml(state.docId)}
                    </div>
                `);
            } else if (state.type === "error") {
                statusDiv.html(`<div style="color:#ef4444;">${escapeHtml(state.msg)}</div>`);
            } else if (state.type === "done") {
                statusDiv.html(`<div style="color:#10b981;">${escapeHtml(state.msg) || 'Completed ✔'}</div>`);
            }
        }
        
        // Update transfer status
        const transferDiv = entryCard.find('.transfer-status');
        if (transferDiv.length) {
            transferDiv.html(transferHtml);
        }
    }
}

// Update transfer status for a specific entry in the UI
export function updateTransferStatusUI(entryId, status, message = "") {
    // Guardar en entryState para persistencia
    updateTransferState(entryId, status, message);
    
    // Buscar el elemento en el DOM
    const transferDiv = $(`#transfer-${entryId}`);
    
    if (transferDiv.length) {
        let html = "";
        
        switch(status) {
            case "transferring":
                html = `
                    <div style="color:#f59e0b; font-size:11px; margin-top:6px; display:flex; align-items:center; gap:6px;">
                        <span class="transfer-spinner"></span> Transferring to server...
                    </div>
                `;
                break;
            case "transferred":
                html = `
                    <div style="color:#10b981; font-size:11px; margin-top:6px; display:flex; align-items:center; gap:4px;">
                        ✓ Transferred to server
                    </div>
                `;
                break;
            case "failed":
                html = `
                    <div style="color:#ef4444; font-size:11px; margin-top:6px;">
                        ❌ Transfer failed: ${escapeHtml(message)}
                    </div>
                `;
                break;
            default:
                html = "";
        }
        
        transferDiv.html(html);
    }
}

// Set items per page
export function setItemsPerPage(count) {
    itemsPerPage = count;
    totalPages = Math.ceil(allEntries.length / itemsPerPage);
    currentPage = 1;
    renderEntries(allEntries, currentPage);
}

// Get current page info
export function getPaginationInfo() {
    return {
        currentPage,
        totalPages,
        itemsPerPage,
        totalItems: allEntries.length
    };
}