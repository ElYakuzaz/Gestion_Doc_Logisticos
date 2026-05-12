// ------------------------------------------------------------------------------------------------------------
// Generates and downloads ZIP files for processed batches.
// File name includes project name, batch index, and timestamp.
// ------------------------------------------------------------------------------------------------------------

import { selectedProjectName } from "./state.js";

/**
 * Generates and downloads ZIP for a batch
 * @param {Object} batch
 */
export async function autoDownloadBatch(batch) {

    const content = await batch.zip.generateAsync({ type: "blob" });

    const now = new Date();

    // Timestamo format
    const pad = (n) => n.toString().padStart(2, "0");

    const timestamp =
        now.getFullYear() + "-" +
        pad(now.getMonth() + 1) + "-" +
        pad(now.getDate()) + "_" +
        pad(now.getHours()) + "-" +
        pad(now.getMinutes()) + "-" +
        pad(now.getSeconds());

    let projectLabel = selectedProjectName || "UNKNOWN_PROJECT";

    projectLabel = projectLabel
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "");

    const fileName = `${projectLabel}_Batch_${batch.batchIndex}_${timestamp}.zip`;

    saveAs(content, fileName);
}