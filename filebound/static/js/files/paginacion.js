// ------------------------------------------------------------------------------------------------------------
// Handles pagination logic for entries UI.
// Splits all entries into pages, renders current page,
// and manages Next/Prev navigation + re-rendering.
// ------------------------------------------------------------------------------------------------------------

import { getEntryState } from "./entryState.js";
import { sanitize } from "./utils.js";

// Pagination state
let currentPage = 0;
const pageSize = 25;
let allEntries = [];

/**
 * Initializes pagination with given batches
 * @param {Array} batches - Array of batches or flat entries
 */
export function initPagination(batches) {

    allEntries = Array.isArray(batches[0])
        ? batches.flat()
        : batches;

    currentPage = 0;

    renderPage();
}

/**
 * Generates HTML for pagination controls (Prev / Next buttons)
 */
function getPaginationHTML() {

    const end = (currentPage + 1) * pageSize;

    return `
        <div class="pagination">
            <button class="prevPage" ${currentPage === 0 ? "disabled" : ""}>
                Prev
            </button>

            <span>
                Page ${currentPage + 1} of ${Math.ceil(allEntries.length / pageSize)}
            </span>

            <button class="nextPage" ${(end >= allEntries.length) ? "disabled" : ""}>
                Next
            </button>
        </div>
    `;
}

/**
 * Renders current page entries + pagination controls
 */
function renderPage() {

    const start = currentPage * pageSize;
    const end = start + pageSize;

    const pageEntries = allEntries.slice(start, end);

    let html = `<h2>Batch Processing</h2>`;

    // TOP PAGINATION
    html += getPaginationHTML();

    // GRID CONTAINER START
    html += `<div class="entries-grid">`;

    // ENTRIES
    pageEntries.forEach((entry, index) => {

        const id = sanitize(entry);
        const globalIndex = start + index + 1;

        html += `
            <div class="entry" id="entry-${id}">
                <b>Entry ${globalIndex}: ${entry}</b>

                <div class="status">
                    ${getEntryState(id)}
                </div>
            </div>
        `;
    });

    // GRID CONTAINER END
    html += `</div>`;

    // BOTTOM PAGINATION
    html += getPaginationHTML();

    $("#output").html(html);

    // EVENTS (delegated)
    $(document).off("click", ".prevPage").on("click", ".prevPage", () => {
        if (currentPage > 0) {
            currentPage--;
            renderPage();
        }
    });

    $(document).off("click", ".nextPage").on("click", ".nextPage", () => {
        if ((currentPage + 1) * pageSize < allEntries.length) {
            currentPage++;
            renderPage();
        }
    });
}

/**
 * Re-renders current page (used after status updates)
 */
export function refreshPagination() {
    renderPage();
}