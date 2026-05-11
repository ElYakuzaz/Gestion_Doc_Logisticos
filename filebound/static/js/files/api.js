// ------------------------------------------------------------------------------------------------------------
// Handles all API calls to FileBound.
// Includes search by entry, fetching documents,
// and downloading document binary (PDF).
// ------------------------------------------------------------------------------------------------------------

/**
 * Searches for files using entry value
 * @param {string} entryValue
 * @returns {Promise<Array>}
 */
export async function searchByEntry(entryValue) {

    const guid = localStorage.getItem("loginGuid");

    return $.ajax({
        url: `${data.baseUrl}/search`,
        type: "GET",
        data: {
            query: entryValue,
            guid: guid
        }
    });
}

/**
 * Retrieves documents for a given file
 * @param {string} fileId
 */
export async function getDocumentsByFile(fileId) {

    const guid = localStorage.getItem("loginGuid");

    return $.ajax({
        url: `${data.baseUrl}/files/${fileId}/documents`,
        type: "GET",
        data: { guid }
    });
}

/**
 * Downloads document binary and returns it as a PDF blob
 * @param {string} documentId
 */
export async function getDocumentBinary(documentId) {

    const guid = localStorage.getItem("loginGuid");

    const response = await fetch(
        `${data.baseUrl}/documentBinaryData/${documentId}?guid=${guid}`
    );

    const buffer = await response.arrayBuffer();

    return new Blob([buffer], { type: "application/pdf" });
}