// ------------------------------------------------------------------------------------------------------------
// Pagination controller for entries grid
// Handles pagination UI, rendering entries with status, and transfer status display
// Enhanced with filtering, priority sorting, live stats, and in-place updates.
// No full grid re-render on every status tick – only when filter/sort changes or status type changes.
// ------------------------------------------------------------------------------------------------------------

import { getRawEntryState, getTransferState, updateTransferState } from "./entryState.js";
import { sanitize } from "./utils.js";

let currentPage = 1;
let itemsPerPage = 50;
let allEntries = [];
let totalPages = 0;

// Filter & sort state
let currentFilter = "all";        // "all", "active", "pending", "processing", "completed", "failed"
let sortPriorityActive = false;    // if true, sort by status priority (processing first)

// Store current display list to avoid recomputing on every stats update
let currentDisplayEntries = [];

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

// Determine status type for an entry (pending, processing, completed, failed)
// IMPORTANT: If entry is in "transferring" state, treat as "processing" so it stays in Active/Processing filters
function getEntryStatusType(entryId) {
    const transfer = getTransferState(entryId);
    if (transfer && transfer.status === "transferring") return "processing";
    
    const state = getRawEntryState(entryId);
    if (!state) return "pending";
    if (state.type === "done") return "completed";
    if (state.type === "error") return "failed";
    // "stage" or "progress" mean processing
    if (state.type === "stage" || state.type === "progress") return "processing";
    return "pending";
}

// Apply filter to entries array
function filterEntries(entries, filterType) {
    if (filterType === "all") return [...entries];
    if (filterType === "active") {
        return entries.filter(entry => {
            const status = getEntryStatusType(entry);
            return status === "pending" || status === "processing";
        });
    }
    return entries.filter(entry => getEntryStatusType(entry) === filterType);
}

// Sort entries by priority: processing > pending > completed > failed
function sortEntriesByPriority(entries) {
    const priority = {
        "processing": 0,
        "pending": 1,
        "completed": 2,
        "failed": 3
    };
    return [...entries].sort((a, b) => {
        const statusA = getEntryStatusType(a);
        const statusB = getEntryStatusType(b);
        return priority[statusA] - priority[statusB];
    });
}

// Get filtered and sorted list based on current settings
function computeDisplayEntries() {
    let filtered = filterEntries(allEntries, currentFilter);
    if (sortPriorityActive) {
        filtered = sortEntriesByPriority(filtered);
    }
    return filtered;
}

// Refresh currentDisplayEntries and totalPages
function updateDisplayCache() {
    currentDisplayEntries = computeDisplayEntries();
    totalPages = Math.ceil(currentDisplayEntries.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
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

// Render pagination controls (shared between top and bottom)
function renderPaginationControls(containerId) {
    const container = $(`#${containerId}`);
    if (!container.length) return;
    const html = `
        <div class="pagination">
            <button class="prevPageBtn" ${currentPage === 1 ? 'disabled' : ''}>← Previous</button>
            <span>Page ${currentPage} of ${totalPages || 1}</span>
            <button class="nextPageBtn" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>Next →</button>
        </div>
    `;
    container.html(html);
    
    container.find(".prevPageBtn").off("click").on("click", () => goToPage(currentPage - 1));
    container.find(".nextPageBtn").off("click").on("click", () => goToPage(currentPage + 1));
}

// Render the entries grid with current pagination (includes both top and bottom pagination)
export function renderEntries() {
    updateDisplayCache();
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageEntries = currentDisplayEntries.slice(start, end);
    
    const container = $("#output");
    if (!container.length) return;
    
    if (!allEntries || allEntries.length === 0) {
        container.html(`
            <div style="display: flex; justify-content: center; align-items: center; min-height: 150px; color: var(--text-muted);">
                No entries found. Please upload a file and click Search.
            </div>
        `);
        return;
    }
    
    let html = `<div id="pagination-top"></div>`;  // top pagination placeholder
    html += `<div class="entries-grid">`;
    
    for (let idx = 0; idx < pageEntries.length; idx++) {
        const entry = pageEntries[idx];
        const entryStr = String(entry);
        const sanitizedId = sanitize(entryStr);
        const entryIdDisplay = escapeHtml(entryStr);
        const globalIndex = allEntries.indexOf(entryStr) + 1;
        const state = getRawEntryState(sanitizedId);
        const transferHtml = getTransferStatusHTML(sanitizedId);
        
        let statusHtml = '';
        if (state) {
            if (state.type === "stage") {
                statusHtml = `<div>${escapeHtml(state.msg)}</div>`;
            } else if (state.type === "progress") {
                const displayPrefix = state.entryIndex ? `${state.entryIndex}. ` : '';
                const docIdDisplay = state.docId ? escapeHtml(String(state.docId)) : 'N/A';
                statusHtml = `
                    <div style="color:#3b82f6;">
                        ${displayPrefix}Processing ${state.current}/${state.total}
                    </div>
                    <div style="color:#9ca3af; font-size: 11px;">
                        Doc: ${docIdDisplay}
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
    
    html += `</div><div id="pagination-bottom"></div>`;
    
    container.html(html);
    
    // Render both pagination controls
    renderPaginationControls("pagination-top");
    renderPaginationControls("pagination-bottom");
}

// Update stats cards and filter button states (without re-rendering grid)
export function updateStatsOnly() {
    const stats = {
        total: allEntries.length,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0
    };
    for (const entry of allEntries) {
        const status = getEntryStatusType(entry);
        stats[status === "completed" ? "completed" : status === "failed" ? "failed" : status === "processing" ? "processing" : "pending"]++;
    }
    const activeCount = stats.pending + stats.processing;
    
    const panel = $("#filterStatsPanel");
    if (!panel.length) return;
    
    const filterButtons = `
        <div class="filter-buttons">
            <button data-filter="all" class="filter-btn ${currentFilter === 'all' ? 'active' : ''}">All (${stats.total})</button>
            <button data-filter="active" class="filter-btn ${currentFilter === 'active' ? 'active' : ''}">Active (${activeCount})</button>
            <button data-filter="pending" class="filter-btn ${currentFilter === 'pending' ? 'active' : ''}">Pending (${stats.pending})</button>
            <button data-filter="completed" class="filter-btn ${currentFilter === 'completed' ? 'active' : ''}">Completed (${stats.completed})</button>
            <button data-filter="failed" class="filter-btn ${currentFilter === 'failed' ? 'active' : ''}">Failed (${stats.failed})</button>
            
        </div>
    `;
    
    const statsHtml = `
        <div class="stats-row">
            <div class="stat-card"><div class="stat-number">${stats.total}</div><div class="stat-label">Total</div></div>
            <div class="stat-card"><div class="stat-number">${activeCount}</div><div class="stat-label">Active</div></div>
            <div class="stat-card"><div class="stat-number">${stats.completed}</div><div class="stat-label">Completed</div></div>
            <div class="stat-card"><div class="stat-number">${stats.failed}</div><div class="stat-label">Failed</div></div>
        </div>
    `;
    
    panel.html(`<div class="filter-stats-panel">${statsHtml}${filterButtons}</div>`);
    
    // Re-attach events
    $(".filter-btn").off("click").on("click", function() {
        const filter = $(this).data("filter");
        if (filter && filter !== currentFilter) {
            currentFilter = filter;
            currentPage = 1;
            updateStatsOnly();
            renderEntries();
        }
    });
    $("#sortPriorityCheckbox").off("change").on("change", function() {
        sortPriorityActive = $(this).is(":checked");
        currentPage = 1;
        updateStatsOnly();
        renderEntries();
    });
}

// Update a single entry's status and transfer divs without re-rendering grid
export function updateSingleEntry(entryId) {
    const entryCard = $(`#entry-${entryId}`);
    if (!entryCard.length) return;
    
    const state = getRawEntryState(entryId);
    const statusDiv = entryCard.find('.status');
    const transferDiv = entryCard.find('.transfer-status');
    
    if (state) {
        let statusHtml = '';
        if (state.type === "stage") {
            statusHtml = `<div>${escapeHtml(state.msg)}</div>`;
        } else if (state.type === "progress") {
            const displayPrefix = state.entryIndex ? `${state.entryIndex}. ` : '';
            const docIdDisplay = state.docId ? escapeHtml(String(state.docId)) : 'N/A';
            statusHtml = `
                <div style="color:#3b82f6;">
                    ${displayPrefix}Processing ${state.current}/${state.total}
                </div>
                <div style="color:#9ca3af; font-size: 11px;">
                    Doc: ${docIdDisplay}
                </div>
            `;
        } else if (state.type === "error") {
            statusHtml = `<div style="color:#ef4444;">${escapeHtml(state.msg)}</div>`;
        } else if (state.type === "done") {
            statusHtml = `<div style="color:#10b981;">${escapeHtml(state.msg) || 'Completed ✔'}</div>`;
        } else {
            statusHtml = `<div style="color:#64748b;">Waiting...</div>`;
        }
        statusDiv.html(statusHtml);
    }
    
    const transfer = getTransferState(entryId);
    if (transfer) {
        let transferHtml = '';
        switch(transfer.status) {
            case "transferring":
                transferHtml = `<div style="color:#f59e0b; font-size:11px; margin-top:6px;"><span class="transfer-spinner"></span> Transferring to server...</div>`;
                break;
            case "transferred":
                transferHtml = `<div style="color:#10b981; font-size:11px; margin-top:6px;">✓ Transferred to server</div>`;
                break;
            case "failed":
                transferHtml = `<div style="color:#ef4444; font-size:11px; margin-top:6px;">❌ Transfer failed: ${escapeHtml(transfer.message)}</div>`;
                break;
        }
        transferDiv.html(transferHtml);
    }
}

// Called when an entry's status type changes (pending->processing, processing->completed, etc.)
// This may require re-rendering the grid if sorting priority is active.
export function onStatusTypeChange(entryId, oldType, newType) {
    // Update stats panel counts
    updateStatsOnly();
    
    // If sort priority is active and the type changed, reorder may be needed
    if (sortPriorityActive && oldType !== newType) {
        renderEntries();
    } else {
        // Otherwise just update this entry's appearance
        updateSingleEntry(entryId);
    }
}

// Initialize pagination with batch data
export function initPagination(batches) {
    const allEntryIds = [];
    for (const batch of batches) {
        for (const entry of batch) {
            const entryStr = String(entry);
            if (!allEntryIds.includes(entryStr)) allEntryIds.push(entryStr);
        }
    }
    allEntries = allEntryIds;
    currentFilter = "all";
    sortPriorityActive = false;
    currentPage = 1;
    updateStatsOnly();
    renderEntries();
}

// Go to a specific page
export function goToPage(page) {
    updateDisplayCache();
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderEntries();
}

// Force a full refresh (e.g., after batch finishes)
export function refreshPagination() {
    if (allEntries.length > 0) {
        renderEntries();
    }
}

// Update transfer status for a specific entry (called from external)
export function updateTransferStatusUI(entryId, status, message = "") {
    updateTransferState(entryId, status, message);
    // Force a re-evaluation of status type for filtering (transferring -> processing)
    // If the entry's filter status changes due to transfer start/end, we may need to re-render
    const oldType = getEntryStatusType(entryId); // before update? Actually we already updated state, so new type is already considered
    updateSingleEntry(entryId);
    updateStatsOnly();
    // If the transfer status change could affect filter inclusion (e.g., transferring now considered processing),
    // and the current filter is "processing" or "active", we need to ensure the entry is visible.
    // A full re-render is safe but we want to avoid flicker. Since updateStatsOnly already updates counts,
    // and updateSingleEntry updates the card, we may need to re-render only if the entry was hidden before
    // and now should be shown, or vice versa. For simplicity, we call renderEntries() only if the filter
    // might have changed inclusion. This can cause a flicker but ensures correctness.
    // A better approach: check if entry is currently in the display list; if not, re-render.
    if (!currentDisplayEntries.includes(entryId) && 
        (currentFilter === "active" || currentFilter === "processing")) {
        renderEntries();
    }
}

// Expose for external calls (like status.js)
window.updateStatsOnly = updateStatsOnly;
window.updateSingleEntry = updateSingleEntry;
window.onStatusTypeChange = onStatusTypeChange;