// ------------------------------------------------------------------------------------------------------------
// Transfer status management - exports functions used by paginacion.js
// This file is a wrapper that re-exports the pagination's transfer status function
// to maintain compatibility with other modules
// ------------------------------------------------------------------------------------------------------------

import { updateTransferStatusUI } from "./paginacion.js";
import { updateTransferState } from "./entryState.js";

// Re-export for use in other files
export { updateTransferStatusUI as updateTransferStatus };

// Optional: Store transfer history
const transferHistory = new Map();

export function getTransferHistory(entryId) {
    return transferHistory.get(entryId);
}

export function clearTransferHistory(entryId) {
    transferHistory.delete(entryId);
}

// Update transfer status with persistence
export function updateTransferStatusWithPersistence(entryId, status, message = "") {
    // Guardar en entryState para que persista al cambiar de página
    updateTransferState(entryId, status, message);
    
    // También actualizar la UI
    updateTransferStatusUI(entryId, status, message);
    
    // Guardar en historial si es necesario
    if (status === "transferred" || status === "failed") {
        transferHistory.set(entryId, {
            status,
            message,
            timestamp: new Date().toISOString()
        });
    }
}

// Listen for transfer events globally
if (typeof window !== 'undefined') {
    window.addEventListener("transferComplete", (event) => {
        const { entries, fileName, duration, remoteDirectory } = event.detail;
        console.log(`🎉 Transfer complete for ${entries.length} entries`);
        console.log(`   File: ${fileName}`);
        console.log(`   Duration: ${duration}s`);
        console.log(`   Remote: ${remoteDirectory}`);
        
        // Store in history and update state for each entry
        for (const entryData of entries) {
            const entryId = entryData.entry || entryData;
            
            // Guardar en entryState
            updateTransferState(entryId, "transferred", `Transferred to ${remoteDirectory}`);
            
            // Guardar en historial
            transferHistory.set(entryId, {
                status: "transferred",
                fileName,
                duration,
                remoteDirectory,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    window.addEventListener("transferFailed", (event) => {
        const { entries, error } = event.detail;
        console.error(`❌ Transfer failed for ${entries.length} entries:`, error);
        
        for (const entryData of entries) {
            const entryId = entryData.entry || entryData;
            
            // Guardar en entryState
            updateTransferState(entryId, "failed", error.message || "Transfer failed");
            
            // Guardar en historial
            transferHistory.set(entryId, {
                status: "failed",
                error: error.message || String(error),
                timestamp: new Date().toISOString()
            });
        }
    });
}