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

$(document).ready(function () {

    // ==============================
    // PROJECT KEY
    // ==============================
    function getProjectKey() {
        const text = $("#projectSelect option:selected").text();

        if (text.includes("US")) return "US";
        if (text.includes("Oakley")) return "Oakley";

        return text.split("-")[0].trim();
    }

    // ==============================
    // GET JSON STATUS
    // ==============================
    async function checkEntryStatus(entryId) {
        const res = await fetch("/api/check-entry-all/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ entry: entryId })
        });

        return await res.json();
    }

    // ==============================
    // SAVE STATUS
    // ==============================
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
    // ==============================
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
    // ==============================
    $("#groupsBtn").click(async function () {

        startTimer();
        const startTime = performance.now();

        const projectKey = getProjectKey();

        $("#output").html("Loading...");

        try {

            const batches = await readEntryFile();
            initPagination(batches);

            const allResults = [];

            for (let b = 0; b < batches.length; b++) {

                const batchEntries = batches[b];

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

                        setEntryStage(entryId, "Searching...");

                        // ==============================
                        // GET JSON STATUS
                        // ==============================
                        const statusData = await checkEntryStatus(entryId) || {};

                        const projectStatus = statusData?.[projectKey] ?? null;

                        const otherProjectKey = projectKey === "US" ? "Oakley" : "US";
                        const otherStatus = statusData?.[otherProjectKey] ?? null;

                        const entryExistsInJson =
                            statusData &&
                            (statusData.US !== undefined || statusData.Oakley !== undefined);

                        // ==============================
                        // ALREADY SUCCESS
                        // ==============================
                        if (projectStatus === true) {
                            setEntryDone(entryId);
                            continue;
                        }

                        // ==============================
                        // ONLY BLOCK IF FAILED BEFORE
                        // ==============================
                        if (projectStatus === false) {
                            setEntryError(entryId, "Previously failed download ❌");
                            continue;
                        }

                        // ==============================
                        // SEARCH API
                        // ==============================
                        const searchResult = await searchByEntry(entry);

                        if (!searchResult || searchResult.length === 0) {

                            if (entryExistsInJson) {
                                setEntryError(entryId, "File exists but failed in this project");
                            } else {
                                setEntryError(entryId, "No file in project");
                            }

                            await markEntry(entryId, projectKey, false);
                            continue;
                        }

                        const filteredResult = searchResult.filter(r => {
                            const pid = String(r.projectId || r.ProjectId || "");
                            return pid === $("#projectSelect").val();
                        });

                        if (filteredResult.length === 0) {

                            if (entryExistsInJson) {
                                setEntryError(entryId, "File exists but failed in this project");
                            } else {
                                setEntryError(entryId, "No file in project");
                            }

                            await markEntry(entryId, projectKey, false);
                            continue;
                        }

                        const fileId =
                            filteredResult[0].fileId ||
                            filteredResult[0].FileId;

                        setEntryStage(entryId, `FileID: ${fileId}`);

                        const documents = await getDocumentsByFile(fileId);

                        setEntryStage(entryId, `Documents: ${documents.length}`);

                        const folder = zip.folder(entry);

                        let docsList = [];

                        for (let i = 0; i < documents.length; i++) {

                            const doc = documents[i];

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

                            docsList.push({ documentId });
                        }

                        await generateGroupedDocuments(
                            folder,
                            documents,
                            getDocumentBinary,
                            entry,
                            entryId
                        );

                        batchResult.entries.push({
                            entry,
                            fileId,
                            docs: docsList
                        });

                        setEntryDone(entryId);

                        await markEntry(entryId, projectKey, true);

                        processedCount++;

                        // ==============================
                        // ZIP EVERY 2 ENTRIES
                        // ==============================
                        if (processedCount % 2 === 0) {

                            allResults.push(batchResult);

                            const shouldZip = $("#zipToggle").is(":checked");

                            if (shouldZip) {
                                await autoDownloadBatch(batchResult);
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
                        setEntryError(entryId, "Request failed");

                        await markEntry(entryId, projectKey, false);
                    }
                }

                // ==============================
                // FINAL ZIP
                // ==============================
                if (batchResult.entries.length > 0) {

                    allResults.push(batchResult);

                    const shouldZip = $("#zipToggle").is(":checked");

                    if (shouldZip) {
                        await autoDownloadBatch(batchResult);
                    }
                }
            }

            const endTime = performance.now();
            stopTimer();

            const durationMs = endTime - startTime;

            const seconds = Math.floor((durationMs / 1000) % 60);
            const minutes = Math.floor((durationMs / (1000 * 60)) % 60);

            $("#output").append(
                `<br><br>⏱ Finished in ${minutes} min ${seconds} sec`
            );

        } catch (err) {

            console.error(err);
            stopTimer();

            $("#output").html("Error processing file.");
        }
    });

    // ==============================
    // FILE NAME DISPLAY
    // ==============================
    $("#entryFile").on("change", function () {

        const fileName =
            this.files[0]?.name ||
            "No file selected";

        $("#fileName").text(fileName);
    });

});