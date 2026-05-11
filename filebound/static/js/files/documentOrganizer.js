// ------------------------------------------------------------------------------------------------------------
// Groups documents by document type and creates merged PDFs ordered by sortOrder.
// Example:
// documents/document_7501.pdf
// documents/document_COMMERCIAL_INVOICE.pdf
//
// HICE PRUEBAS CON; AEK03391942 <=====
// ------------------------------------------------------------------------------------------------------------

import { imageToPdfBlob } from "./pdf.js";

/**
 * Generates grouped merged PDFs by document type
 * @param {Object} folder
 * @param {Array} documents
 * @param {Function} getDocumentBinary
 */
export async function generateGroupedDocuments(
    folder,
    documents,
    getDocumentBinary
) {

    const grouped = {};

    // Group documents by divider/type
    for (const doc of documents) {

        const rawType =
            doc.divider ||
            "UNKNOWN";

        const type = rawType
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9_]/g, "");

        if (!grouped[type]) {
            grouped[type] = [];
        }

        grouped[type].push(doc);
    }

    // Create documents folder
    const docsFolder = folder.folder("documents");

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

            console.log(
                `Generating grouped PDF: ${type} -> ${documentId}`
            );

            // Download original image
            const imageBlob =
                await getDocumentBinary(documentId);

            // Convert to PDF
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

        docsFolder.file(
            `document_${type}.pdf`,
            finalPdfBytes
        );
    }
}