// ------------------------------------------------------------------------------------------------------------
// Reads uploaded .txt file and converts it into batches.
// Each line = batch, each value separated by "|" = entry.
// ------------------------------------------------------------------------------------------------------------

/**
 * Reads the selected file and returns parsed batches
 * Format:
 * Each line = batch
 * Each value separated by "|" = entry
 * 
 * @returns {Promise<Array>} batches
 */
export function readEntryFile() {
    return new Promise((resolve, reject) => {

        const fileInput = document.getElementById("entryFile");

        if (!fileInput || !fileInput.files.length) {
            reject("No file selected");
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {

            const text = e.target.result;

            const batches = text
                .split("\n")
                .map(line => line.trim())
                .filter(line => line !== "")
                .map(line => line.split("|").map(x => x.trim()));

            resolve(batches);
        };

        reader.onerror = reject;

        reader.readAsText(fileInput.files[0]);
    });
}