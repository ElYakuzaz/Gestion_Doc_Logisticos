// ------------------------------------------------------------------------------------------------------------
// Builds and renders the base UI for batches and entries.
// Displays entries with their current processing status.
// ------------------------------------------------------------------------------------------------------------
import { sanitize } from "./utils.js";
import { getEntryState } from "./entryState.js";

/**
 * Generates and renders the initial UI for all batches
 * Each batch contains multiple entries
 * 
 * @param {Array} batches - Array of batches with entries
 */
export function createBaseUI(batches) {

    let html = `<h2>Batch Processing</h2>`;

    batches.forEach((batch,bIndex) => {

        html += `<div class="batch" id="batch-${bIndex}">
            <h3>Batch </h3>`;

        batch.forEach((entry, eIndex) => {

            const id = sanitize(entry);

            html += `
                <div class="entry" id="entry-${id}">
                    <b>Entry ${eIndex + 1} - ${entry}</b>
                    <div class="status">
                        ${getEntryState(id)}
                    </div>
                </div>
            `;
        });

        html += `</div>`;
    });

    $("#output").html(html);
}