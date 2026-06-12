// ------------------------------------------------------------------------------------------------------------
// Local Export Mode - Main controller
// Allows custom document selection and local directory saving
// NO JSON REGISTRATION - unlimited local downloads
// ONLY SELECTED DOCUMENTS ARE PROCESSED
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

import { sanitize } from "./utils.js";
import { initPagination } from "./paginacion.js";
import { startTimer, stopTimer } from "./timer.js";
import { generateGroupedDocuments } from "./documentOrganizer.js";

// ============================================
// LISTA DE DOCUMENTOS PERMITIDOS (PRESELECCIONADOS)
// ============================================
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

// Inicializar SELECTED_DOCUMENTS con la lista completa (todos seleccionados por defecto)
let SELECTED_DOCUMENTS = new Set(ALLOWED_DOCUMENTS.map(d => d.toUpperCase().trim()));

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
    // GET JSON STATUS (solo para verificar, NO para marcar)
    async function checkEntryStatus(entryId) {
        const res = await fetch("/api/check-entry-all/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entry: entryId })
        });
        return await res.json();
    }

    // NOTA: NO usamos markEntry en Local Export
    // Las descargas locales son ilimitadas y no requieren tracking

    // ==============================
    // SAVE ZIP LOCALLY (no tracking, no folder date)
    async function saveZipLocally(zipBlob, entry, localDirectory) {
        const formData = new FormData();
        formData.append("file", zipBlob, `${entry}.zip`);
        formData.append("entry", entry);
        formData.append("local_directory", localDirectory);

        const response = await fetch("/api/save-zip-local/", {
            method: "POST",
            body: formData
        });

        return await response.json();
    }

    // ==============================
    // FILTER DOCUMENTS BASED ON SELECTED DOCUMENTS (checklist)
    function filterDocumentsBySelection(documents) {
        if (SELECTED_DOCUMENTS.size === 0) {
            console.warn("⚠️ No documents selected, nothing will be exported");
            return [];
        }
        
        // SELECTED_DOCUMENTS ya contiene strings en mayúsculas
        return documents.filter(doc => {
            const divider = doc.divider || doc.Divider || "";
            const dividerUpper = divider.toUpperCase().trim();
            return SELECTED_DOCUMENTS.has(dividerUpper);
        });
    }

    // ==============================
    // BUILD DOCUMENT CHECKLIST (Muestra TODOS los documentos de ALLOWED_DOCUMENTS)
    async function buildDocumentChecklist() {
        const container = $("#documentChecklist");
        container.html('<div class="loading-checklist">Loading document checklist...</div>');
        
        // Siempre mostrar todos los documentos de ALLOWED_DOCUMENTS
        // No necesitamos esperar a cargar un entry para mostrar el checklist
        
        let html = '';
        
        // Ordenar alfabéticamente
        const sortedDocuments = [...ALLOWED_DOCUMENTS].sort();
        
        for (const docType of sortedDocuments) {
            const docTypeUpper = docType.toUpperCase().trim();
            const isChecked = SELECTED_DOCUMENTS.has(docTypeUpper);
            const safeId = docType.replace(/[^a-zA-Z0-9]/g, '_');
            
            html += `
                <div class="checklist-item" data-doc-type="${docTypeUpper}">
                    <input type="checkbox" id="doc_${safeId}" ${isChecked ? 'checked' : ''}>
                    <label for="doc_${safeId}">${docType}</label>
                </div>
            `;
        }
        
        container.html(html);
        
        // Attach event listeners
        $(".checklist-item input").on("change", function() {
            const docTypeUpper = $(this).closest(".checklist-item").data("doc-type");
            if ($(this).is(":checked")) {
                SELECTED_DOCUMENTS.add(docTypeUpper);
            } else {
                SELECTED_DOCUMENTS.delete(docTypeUpper);
            }
            console.log("Selected documents:", Array.from(SELECTED_DOCUMENTS));
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
    // MAIN PROCESS (SIN REGISTRO EN JSON - SIN FOLDER DATE)
    $("#groupsBtn").click(async function () {
        const localDirectory = $("#localDirectory").val();

        if (!localDirectory) {
            alert("Please enter a local directory destination.");
            $("#localDirectory").focus();
            return;
        }

        if (SELECTED_DOCUMENTS.size === 0) {
            alert("Please select at least one document type to export.");
            return;
        }

        startTimer();

        const startTime = performance.now();
        const projectKey = getProjectKey();

        $("#output").html('<div style="text-align: center; padding: 40px;">Processing entries...</div>');

        try {
            const batches = await readEntryFile();
            initPagination(batches);

            let totalProcessed = 0;
            let totalFailed = 0;

            for (let b = 0; b < batches.length; b++) {
                const batchEntries = batches[b];
                let entryCounter = 1;

                for (let entry of batchEntries) {
                    const entryId = sanitize(entry);

                    try {
                        setEntryStage(entryId, "Searching...", entryCounter);

                        const searchResult = await searchByEntry(entry);

                        if (!searchResult || searchResult.length === 0) {
                            setEntryError(entryId, "No file found", entryCounter);
                            entryCounter++;
                            totalFailed++;
                            continue;
                        }

                        const filteredResult = searchResult.filter(r => {
                            const pid = String(r.projectId || r.ProjectId || "");
                            return pid === $("#projectSelect").val();
                        });

                        if (filteredResult.length === 0) {
                            setEntryError(entryId, "No file in project", entryCounter);
                            entryCounter++;
                            totalFailed++;
                            continue;
                        }

                        const fileId = filteredResult[0].fileId || filteredResult[0].FileId;
                        setEntryStage(entryId, `FileID: ${fileId}`, entryCounter);

                        const documents = await getDocumentsByFile(fileId);
                        
                        // Filtrar SOLO por selección del usuario (checklist)
                        // Ya no necesitamos filterAllowedDocuments porque el checklist
                        // solo muestra documentos de ALLOWED_DOCUMENTS
                        const finalDocuments = filterDocumentsBySelection(documents);
                        
                        console.log(`📊 ${entry}:`);
                        console.log(`   - Total documentos en entry: ${documents.length}`);
                        console.log(`   - Documentos seleccionados encontrados: ${finalDocuments.length}`);
                        console.log("   - Documentos a exportar:", finalDocuments.map(d => d.divider));
                        
                        setEntryStage(entryId, `Documents to export: ${finalDocuments.length}`, entryCounter);

                        if (finalDocuments.length === 0) {
                            setEntryError(entryId, `No selected documents found in this entry`, entryCounter);
                            entryCounter++;
                            totalFailed++;
                            continue;
                        }

                        const zip = new JSZip();
                        const folder = zip.folder(entry);
                        let docsList = [];

                        for (let i = 0; i < finalDocuments.length; i++) {
                            const doc = finalDocuments[i];
                            const documentId = doc.documentId || doc.DocumentId;
                            
                            setEntryProgress(entryId, entry, fileId, i + 1, finalDocuments.length, documentId, entryCounter);
                            docsList.push({ documentId });
                        }

                        await generateGroupedDocuments(folder, finalDocuments, getDocumentBinary, entry, entryId);
                        
                        const zipBlob = await zip.generateAsync({ type: "blob" });
                        const result = await saveZipLocally(zipBlob, entry, localDirectory);
                        
                        if (result.success) {
                            setEntryDone(entryId, entryCounter);
                            totalProcessed++;
                        } else {
                            setEntryError(entryId, `Save failed: ${result.error}`, entryCounter);
                            totalFailed++;
                        }
                        
                        entryCounter++;

                    } catch (err) {
                        console.error(err);
                        setEntryError(entryId, "Request failed", entryCounter);
                        entryCounter++;
                        totalFailed++;
                    }
                }
            }

            stopTimer();
            
            const endTime = performance.now();
            const durationMs = endTime - startTime;
            const seconds = Math.floor((durationMs / 1000) % 60);
            const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
            
            // $("#output").append(`
            //     <div style="margin-top: 20px; padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; text-align: center;">
            //         Local export completed!<br>
            //         Processed: ${totalProcessed} | Failed: ${totalFailed}<br>
            //         Time: ${minutes}m ${seconds}s<br>
            //         Saved to: ${localDirectory}<br>
            //         Only selected documents were exported
            //     </div>
            // `);

        } catch (err) {
            console.error(err);
            stopTimer();
            $("#output").html('<div style="color: red; padding: 20px; text-align: center;">Error processing file. Check console for details.</div>');
        }
    });

    // ==============================
    // EVENT HANDLERS
    $("#entryFile").on("change", function () {
        const fileName = this.files[0]?.name || "No file selected";
        $("#fileName").text(fileName);
        // No rebuild checklist - se mantiene igual
    });
    
    $("#selectAllBtn").on("click", function() {
        $(".checklist-item input").prop("checked", true).trigger("change");
        ALLOWED_DOCUMENTS.forEach(doc => {
            SELECTED_DOCUMENTS.add(doc.toUpperCase().trim());
        });
        console.log("Selected all documents:", Array.from(SELECTED_DOCUMENTS));
    });
    
    $("#deselectAllBtn").on("click", function() {
        $(".checklist-item input").prop("checked", false).trigger("change");
        SELECTED_DOCUMENTS.clear();
        console.log("Deselected all documents");
    });
    
    $("#browseDirectoryBtn").on("click", function() {
        alert("Please type or paste the full directory path in the input field.\n\nExample: C:\\Users\\YourName\\Documents\\Exports\\");
    });
    
    $("#localDirectory").on("input", function() {
        const value = $(this).val();
        $("#directoryPreview").text(value || "(not selected)");
    });
    
    // Construir el checklist inmediatamente al cargar la página
    buildDocumentChecklist();
    
    console.log("✅ Local Export ready. Allowed documents:", ALLOWED_DOCUMENTS);
    console.log("✅ Selected documents (default):", Array.from(SELECTED_DOCUMENTS));
});