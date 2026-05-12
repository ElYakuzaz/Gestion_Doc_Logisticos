// ------------------------------------------------------------------------------------------------------------
// Groups documents by document type and creates merged PDFs ordered by sortOrder.
// Example:
// documents/document_7501.pdf
// documents/document_COMMERCIAL_INVOICE.pdf
// ------------------------------------------------------------------------------------------------------------

import { imageToPdfBlob } from "./pdf.js";
import { setEntryProgress } from "./status.js";

/**
 * Generates grouped merged PDFs by document type
 * @param {Object} folder
 * @param {Array} documents
 * @param {Function} getDocumentBinary
 * @param {string} entry
 * @param {string} entryId
 */
export async function generateGroupedDocuments(
    folder,
    documents,
    getDocumentBinary,
    entry,
    entryId
) {

    let processedDocs = 0;
    const totalDocs = documents.length;

    const grouped = {};

    // Group documents by divider/type
    for (const doc of documents) {

        const rawType = doc.divider || "UNKNOWN";

        const cleanType = rawType
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9_]/g, "");

        const type = cleanType;

        if (!grouped[type]) {
            grouped[type] = [];
        }

        grouped[type].push(doc);
    }

    // Create documents folder
    // const docsFolder = folder.folder("documents");

    // Save directly in ZIP root
    const docsFolder = folder;

    // Process each document type
    for (const type in grouped) {

        // Sort by sortOrder
        grouped[type].sort((a, b) => {
            return (a.sortOrder || 0) - (b.sortOrder || 0);
        });

        // Create merged PDF
        const mergedPdf = await PDFLib.PDFDocument.create();

        // Loop documents in correct order
        for (const doc of grouped[type]) {

            const documentId =
                doc.documentId ||
                doc.DocumentId;

            processedDocs++;

            // Update UI progress
            setEntryProgress(
                entryId,
                entry,
                "MERGING",
                processedDocs,
                totalDocs,
                documentId
            );

            console.log(
                `Generating grouped PDF: ${type} -> ${documentId}`
            );

            // Download original image
            const imageBlob =
                await getDocumentBinary(documentId);

            // Convert image to PDF
            const pdfBlob =
                await imageToPdfBlob(imageBlob);

            const pdfBytes =
                await pdfBlob.arrayBuffer();

            // Load PDF
            const sourcePdf =
                await PDFLib.PDFDocument.load(pdfBytes);

            // Copy pages
            const copiedPages =
                await mergedPdf.copyPages(
                    sourcePdf,
                    sourcePdf.getPageIndices()
                );

            // Add pages
            copiedPages.forEach((page) => {
                mergedPdf.addPage(page);
            });
        }

        // Save final merged PDF
        const finalPdfBytes =
            await mergedPdf.save();

        // Final file naming: ENTRY + TYPE
        docsFolder.file(
            `${entry}_${type}.pdf`,
            finalPdfBytes
        );
    }
}