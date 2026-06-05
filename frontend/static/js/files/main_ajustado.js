// ------------------------------------------------------------------------------------------------------------
// Main controller of the application
// ------------------------------------------------------------------------------------------------------------

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
import { sanitize } from "./utils.js";
import { initPagination } from "./paginacion.js";
import { startTimer, stopTimer } from "./timer.js";
import { generateGroupedDocuments } from "./documentOrganizer.js";

// PARA FILTRACIONES
// ==============================
// LISTA DE DOCUMENTOS PERMITIDOS
// ==============================
const ALLOWED_DOCUMENTS = [
    "DROP BALL / IRC",
    "CARRIER CERTIFICATE", 
    "7501",
    "3461",
    "AIR WAY BILL",
    "DROP BALL CERTIFICATE",
    "PACKING LIST",
    "IRC CERTIFICATE",
    "POD",
    "COMMERCIAL INVOICE",
    "CERTIFICATE OF ORIGIN",
    "UNASSIGNED"
];

// Crear un Set para búsqueda rápida (case insensitive)
const ALLOWED_DOCUMENTS_SET = new Set(ALLOWED_DOCUMENTS.map(d => d.toUpperCase().trim()));
// FINALIZAR FILTROS

$(document).ready(function () {
    
    // ==============================
    // PROJECT KEY 
    function getProjectKey() {

        const text = $("#projectSelect option:selected").text();

        if (text.includes("US")) return "US";
        if (text.includes("Oakley")) return "Oakley";

        return text.split("-")[0].trim();
    }

    // ==============================
    // GET JSON STATUS
    async function checkEntryStatus(entryId) {

        const res = await fetch("/api/check-entry-all/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                entry: entryId
            })
        });

        return await res.json();
    }

    // ==============================
    // SAVE STATUS 
    async function markEntry(entryId, projectKey, status) {

        await fetch("/api/mark-entry/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                entry: entryId,
                project: projectKey,
                status: status
            })
        });
    }

    // ==============================
    // INIT PROJECT 
    setProject(
        $("#projectSelect").val(),
        $("#projectSelect option:selected").text()
    );

    $("#projectSelect").on("change", function () {

        const id = $(this).val();

        const name = $("#projectSelect option:selected").text()
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9_]/g, "");

        setProject(id, name);
    });

    // ==============================
    // MAIN PROCESS 
    $("#groupsBtn").click(async function () {
        const folderDate = $("#folderDate").val();

        // 🚨 HARD BLOCK (no date = stop EVERYTHING)
        if (!folderDate) {
            alert("Please select a folder date before searching.");
            $("#folderDate").focus();
            return;
        }

        startTimer();

        const startTime = performance.now();

        const projectKey = getProjectKey();

        $("#output").html("Loading...");

        try {

            const batches = await readEntryFile();
            

            initPagination(batches);

            const allResults = [];

            // ###### LOOP-----------------------
            for (let b = 0; b < batches.length; b++) {

                const batchEntries = batches[b];
                let entryCounter = 1;  // ✅ AGREGAR: Contador de entradas

                let zipCounter = 1;
                let processedCount = 0;

                let zip = new JSZip();

                let batchResult = {
                    batchIndex: zipCounter,
                    zip: zip,
                    entries: []
                };

                for (let entry of batchEntries) {

                    const entryId = sanitize(entry);

                    try {
                        // ✅ MODIFICADO: Pasar entryCounter
                        setEntryStage(entryId, "Searching...", entryCounter);

                        // ==============================
                        // GET JSON STATUS 
                        const statusData =
                            await checkEntryStatus(entryId) || {};

                        const projectStatus =
                            statusData?.[projectKey] ?? null;

                        const otherProjectKey =
                            projectKey === "US"
                                ? "Oakley"
                                : "US";

                        const otherStatus =
                            statusData?.[otherProjectKey] ?? null;

                        const entryExistsInJson =
                            statusData &&
                            (
                                statusData.US !== undefined ||
                                statusData.Oakley !== undefined
                            );

                        // ==============================
                        // ALREADY SUCCESS 
                        if (projectStatus === true) {
                            // ✅ MODIFICADO: Pasar entryCounter
                            setEntryDone(entryId, entryCounter);
                            entryCounter++;  // ✅ AGREGAR: Incrementar contador
                            continue;
                        }

                        // ==============================
                        // PREVIOUSLY FAILED 
                        if (projectStatus === false) {
                            // ✅ MODIFICADO: Pasar entryCounter
                            setEntryError(
                                entryId,
                                "Previously failed download ❌",
                                entryCounter
                            );
                            entryCounter++;  // ✅ AGREGAR: Incrementar contador
                            continue;
                        }

                        // ==============================
                        // SEARCH API 
                        const searchResult =
                            await searchByEntry(entry);

                        if (
                            !searchResult ||
                            searchResult.length === 0
                        ) {

                            if (entryExistsInJson) {
                                // ✅ MODIFICADO: Pasar entryCounter
                                setEntryError(
                                    entryId,
                                    "File exists but failed in this project",
                                    entryCounter
                                );
                            } else {
                                // ✅ MODIFICADO: Pasar entryCounter
                                setEntryError(
                                    entryId,
                                    "No file in project",
                                    entryCounter
                                );
                            }

                            await markEntry(
                                entryId,
                                projectKey,
                                false
                            );
                            entryCounter++;  // ✅ AGREGAR: Incrementar contador
                            continue;
                        }

                        // ==============================
                        // FILTER PROJECT 
                        const filteredResult =
                            searchResult.filter(r => {

                                const pid =
                                    String(
                                        r.projectId ||
                                        r.ProjectId ||
                                        ""
                                    );

                                return pid ===
                                    $("#projectSelect").val();
                            });

                        if (filteredResult.length === 0) {

                            if (entryExistsInJson) {
                                // ✅ MODIFICADO: Pasar entryCounter
                                setEntryError(
                                    entryId,
                                    "File exists but failed in this project",
                                    entryCounter
                                );
                            } else {
                                // ✅ MODIFICADO: Pasar entryCounter
                                setEntryError(
                                    entryId,
                                    "No file in project",
                                    entryCounter
                                );
                            }

                            await markEntry(
                                entryId,
                                projectKey,
                                false
                            );
                            entryCounter++;  // ✅ AGREGAR: Incrementar contador
                            continue;
                        }

                        // ==============================
                        // FILE INFO 
                        const fileId =
                            filteredResult[0].fileId ||
                            filteredResult[0].FileId;

                        // ✅ MODIFICADO: Pasar entryCounter
                        setEntryStage(
                            entryId,
                            `FileID: ${fileId}`,
                            entryCounter
                        );

                        const documents = await getDocumentsByFile(fileId);

                        // FILTRO PARA QUE DESCARGUEN SIN PROBLEMA LAS COSAS
                        // Filtrar documentos - solo los permitidos
                        const filteredDocuments = documents.filter(doc => {
                            const divider = doc.divider || "";
                            const dividerUpper = divider.toUpperCase().trim();
                            const isAllowed = ALLOWED_DOCUMENTS_SET.has(dividerUpper);
                            
                            if (!isAllowed) {
                                console.log(`❌ Excluyendo: "${divider}" (ID: ${doc.documentId})`);
                            }
                            
                            return isAllowed;
                        });

                        console.log(`📊 ${entry}: ${documents.length} total → ${filteredDocuments.length} permitidos`);
                        // ---------------------------------------
                        
                        console.log("=================================");
                        console.log(`ENTRY: ${entry}`);
                        console.log(`FILE ID: ${fileId}`);
                        console.log(`📄 Total documentos: ${documents.length}`);
                        console.log(`✅ Documentos a procesar: ${filteredDocuments.length}`);
                        console.table(
                            filteredDocuments.map(d => ({
                                documentId: d.documentId,
                                divider: d.divider,
                                sortOrder: d.sortOrder
                            }))
                        );

                        setEntryStage(
                            entryId,
                            `Documentos: ${filteredDocuments.length} (de ${documents.length})`,
                            entryCounter
                        );

                        // //MODIFICADO: Pasar entryCounter
                        // setEntryStage(
                        //     entryId,
                        //     `Documents: ${documents.length}`,
                        //     entryCounter
                        // );

                        const folder = zip.folder(entry);

                        let docsList = [];

                        // ==============================
                        // DOCUMENT LOOP 
                        for (let i = 0; i < filteredDocuments.length; i++) {

                            const doc = filteredDocuments[i];

                            const documentId =
                                doc.documentId ||
                                doc.DocumentId;

                            // ✅ MODIFICADO: Pasar entryCounter
                            setEntryProgress(
                                entryId,
                                entry,
                                fileId,
                                i + 1,
                                filteredDocuments.length,
                                documentId,
                                entryCounter
                            );

                            docsList.push({
                                documentId
                            });
                        }

                        // ==============================
                        // GENERATE PDFs 
                        await generateGroupedDocuments(
                            folder,
                            filteredDocuments,
                            getDocumentBinary,
                            entry,
                            entryId
                        );

                        batchResult.entries.push({
                            entry,
                            fileId,
                            docs: docsList
                        });

                        // ✅ MODIFICADO: Pasar entryCounter
                        setEntryDone(entryId, entryCounter);

                        processedCount++;
                        entryCounter++;  // ✅ AGREGAR: Incrementar contador después de éxito

                        // ==============================
                        // ZIP EVERY 2 ENTRIES 
                        if (processedCount % 1 === 0) {

                            allResults.push(batchResult);

                            const shouldZip =
                                $("#zipToggle").is(":checked");

                            if (shouldZip) {

                                // ==============================
                                // DOWNLOAD ZIP 
                                await autoDownloadBatch(
                                    batchResult
                                );

                                // ==============================
                                // SAVE SUCCESS AFTER DOWNLOAD 
                                for (
                                    const zipEntry
                                    of batchResult.entries
                                ) {

                                    await markEntry(
                                        sanitize(zipEntry.entry),
                                        projectKey,
                                        true
                                    );
                                }
                            }

                            zipCounter++;

                            zip = new JSZip();

                            batchResult = {
                                batchIndex: zipCounter,
                                zip: zip,
                                entries: []
                            };
                        }

                    } catch (err) {

                        console.error(err);

                        // ==============================
                        // PAGE REFRESH / TAB CLOSE 
                        if (
                            err.name === "AbortError" ||
                            err.message?.includes("Failed to fetch")
                        ) {

                            // ✅ MODIFICADO: Pasar entryCounter
                            setEntryError(
                                entryId,
                                "Process interrupted",
                                entryCounter
                            );

                            // IMPORTANT:
                            // Do NOT save false in JSON
                            entryCounter++;  // ✅ AGREGAR: Incrementar contador
                            continue;
                        }
                        // ✅ MODIFICADO: Pasar entryCounter
                        setEntryError(
                            entryId,
                            "Request failed",
                            entryCounter
                        );

                        await markEntry(
                            entryId,
                            projectKey,
                            false
                        );
                        entryCounter++;  // ✅ AGREGAR: Incrementar contador
                    }
                }

                // ==============================
                // FINAL ZIP 
                if (batchResult.entries.length > 0) {

                    allResults.push(batchResult);

                    const shouldZip =
                        $("#zipToggle").is(":checked");

                    if (shouldZip) {

                        // ==============================
                        // DOWNLOAD ZIP 
                        await autoDownloadBatch(batchResult);

                        // ==============================
                        // SAVE SUCCESS AFTER DOWNLOAD 
                        for (
                            const zipEntry
                            of batchResult.entries
                        ) {

                            await markEntry(
                                sanitize(zipEntry.entry),
                                projectKey,
                                true
                            );
                        }
                    }
                }
            }

            // ##### LOOP END -----------------------------

            const endTime = performance.now();

            stopTimer();

            const durationMs =
                endTime - startTime;

            const seconds =
                Math.floor(
                    (durationMs / 1000) % 60
                );

            const minutes =
                Math.floor(
                    (durationMs / (1000 * 60)) % 60
                );

            // $("#output").append(
            //     `<br><br>⏱ Finished in ${minutes} min ${seconds} sec`
            // );

        } catch (err) {

            console.error(err);

            stopTimer();

            $("#output").html(
                "Error processing file."
            );
        }
    });

    // ==============================
    // FILE NAME DISPLAY 
    $("#entryFile").on("change", function () {

        const fileName =
            this.files[0]?.name ||
            "No file selected";

        $("#fileName").text(fileName);
    });

});