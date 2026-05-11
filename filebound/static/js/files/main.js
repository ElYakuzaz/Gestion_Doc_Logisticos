// ------------------------------------------------------------------------------------------------------------
// Main controller of the application.
// Handles user interactions (project selection, file upload, button click),
// orchestrates the full workflow:
// - reads entry file
// - initializes UI (pagination)
// - searches entries via API
// - fetches documents and converts them to PDFs
// - groups documents by type + sort order
// - updates UI status in real-time
// - optionally generates and downloads ZIP files.
// ------------------------------------------------------------------------------------------------------------

// IMPORTS
import { setProject } from "./state.js";
import { readEntryFile } from "./fileReader.js";
import {
    searchByEntry,
    getDocumentsByFile,
    getDocumentBinary
} from "./api.js";

import {
    setEntryStage,
    setEntryProgress,
    setEntryError,
    setEntryDone
} from "./status.js";

import { autoDownloadBatch } from "./zipManager.js";
import { imageToPdfBlob } from "./pdf.js";
import { sanitize } from "./utils.js";
import { initPagination } from "./paginacion.js";
import { startTimer, stopTimer } from "./timer.js";

// NEW
import { generateGroupedDocuments } from "./documentOrganizer.js";
// ----


$(document).ready(function () {

    // Initialize selected project
    setProject(
        $("#projectSelect").val(),
        $("#projectSelect option:selected").text()
    );

    // Project selector change
    $("#projectSelect").on("change", function () {

        const id = $(this).val();

        const name = $("#projectSelect option:selected").text()
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9_]/g, "");

        setProject(id, name);

        console.log("Project selected:", id, name);
    });


    // Main process button
    $("#groupsBtn").click(async function () {

        startTimer();

        const startTime = performance.now();

        const currentProjectId = $("#projectSelect").val();

        $("#output").html("Loading...");

        try {

            // Read uploaded txt file
            const batches = await readEntryFile();

            // Initialize paginated UI
            initPagination(batches);

            const allResults = [];

            // Loop batches
            for (let b = 0; b < batches.length; b++) {

                const batchEntries = batches[b];

                const zip = new JSZip();

                const batchResult = {
                    batchIndex: b + 1,
                    zip: zip,
                    entries: []
                };

                // Loop entries
                for (let entry of batchEntries) {

                    const entryId = sanitize(entry);

                    try {

                        setEntryStage(entryId, "Searching...");

                        const searchResult = await searchByEntry(entry);

                        console.log("🔎 searchByEntry RESULT for entry:", entry);
                        console.log(searchResult);

                        // No results
                        if (!searchResult || searchResult.length === 0) {
                            setEntryError(entryId, "No file found");
                            continue;
                        }

                        // Filter by selected project
                        const filteredResult = searchResult.filter(r => {

                            const pid = String(
                                r.projectId ||
                                r.ProjectId ||
                                ""
                            );

                            return pid === String(currentProjectId);
                        });

                        if (filteredResult.length === 0) {
                            setEntryError(entryId, "No file in selected project");
                            continue;
                        }

                        // Get File ID
                        const fileId =
                            filteredResult[0].fileId ||
                            filteredResult[0].FileId;

                        setEntryStage(entryId, `FileID: ${fileId}`);

                        // Fetch documents
                        const documents = await getDocumentsByFile(fileId);

                        setEntryStage(
                            entryId,
                            `Documents: ${documents.length}`
                        );

                        // Create folder per entry
                        const folder = zip.folder(entry);

                        let docsList = [];

                        // Download individual documents
                        for (let i = 0; i < documents.length; i++) {

                            const doc = documents[i];

                            console.log("DOCUMENT:");
                            console.log(doc);

                            const documentId =
                                doc.documentId ||
                                doc.DocumentId;

                            setEntryProgress(
                                entryId,
                                entry,
                                fileId,
                                i + 1,
                                documents.length,
                                documentId
                            );

                            // --------- AQUI SE HACEN EN PDF LOS ARCHIVOS INDIVIDUALES PDF CONVERTIR
                            // // Download original image/blob
                            // const imageBlob = await getDocumentBinary(documentId);

                            // // Convert image to PDF
                            // const pdfBlob = await imageToPdfBlob(imageBlob);

                            // // Save individual PDF
                            // folder.file(`${documentId}.pdf`, pdfBlob);
                            // ---------- aqui finaliza la conversion de pdf a archivos individuales

                            // --------- AQUI SE MANTIENEN LOS ARCHIVOS EN FORMATO TIFF || TIFF CONVERTIR
                            // Download original TIFF/image
                            const imageBlob = await getDocumentBinary(documentId);

                            // Get original extension
                            const extension =
                                (doc.extension || "tif")
                                .toLowerCase();

                            // Save ORIGINAL file without converting
                            folder.file(
                                `${documentId}.${extension}`,
                                imageBlob
                            );
                            // --------- AQUI TERMINA LO DE MANTENER EN FORMATO TIFF


                            docsList.push({
                                documentId
                            });
                        }

                        // Generate grouped merged PDFs
                        await generateGroupedDocuments(
                            folder,
                            documents,
                            getDocumentBinary
                        );

                        // Store batch result
                        batchResult.entries.push({
                            entry,
                            fileId,
                            docs: docsList
                        });

                        setEntryDone(entryId);

                    } catch (err) {

                        console.error(err);

                        setEntryError(
                            entryId,
                            "Request failed"
                        );
                    }
                }

                allResults.push(batchResult);

                // Auto download ZIP
                const shouldZip = $("#zipToggle").is(":checked");

                if (shouldZip) {
                    await autoDownloadBatch(batchResult);
                }
            }

            // Finish timer
            const endTime = performance.now();

            stopTimer();

            const durationMs = endTime - startTime;

            const seconds = Math.floor(
                (durationMs / 1000) % 60
            );

            const minutes = Math.floor(
                (durationMs / (1000 * 60)) % 60
            );

            $("#output").append(
                `<br><br>⏱ Finished in ${minutes} min ${seconds} sec`
            );

        } catch (err) {

            console.error(err);

            stopTimer();

            $("#output").html(
                "Error processing file."
            );
        }
    });

    // File name display
    $("#entryFile").on("change", function () {

        const fileName =
            this.files[0]?.name ||
            "No file selected";

        $("#fileName").text(fileName);
    });

});