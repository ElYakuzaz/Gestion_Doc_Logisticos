import { selectedProjectName } from "./state.js";

async function uploadZipToServer(blob, fileName, entry) {

    const formData = new FormData();

    formData.append("file", blob, fileName);
    formData.append("entry", entry); 

    const response = await fetch("/api/save-zip/", {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error("Failed to upload ZIP");
    }

    return await response.json();
}

export async function autoDownloadBatch(batch) {

    const content = await batch.zip.generateAsync({
        type: "blob"
    });

    const now = new Date();

    const pad = (n) =>
        n.toString().padStart(2, "0");

    const timestamp =
        now.getFullYear() + "-" +
        pad(now.getMonth() + 1) + "-" +
        pad(now.getDate()) + "_" +
        pad(now.getHours()) + "-" +
        pad(now.getMinutes()) + "-" +
        pad(now.getSeconds());

    let projectLabel =
        selectedProjectName || "UNKNOWN_PROJECT";

    projectLabel = projectLabel
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "");

    const fileName =
        `${projectLabel}_Batch_${batch.batchIndex}_${timestamp}.zip`;

    // SEND TO DJANGO INSTEAD OF DOWNLOAD
    await uploadZipToServer(content, fileName, batch.entries[0].entry);
}