// ------------------------------------------------------------------------------------------------------------
// Transfer status management - exports functions used by paginacion.js
// This file is a wrapper that re-exports the pagination's transfer status function
// to maintain compatibility with other modules
// ------------------------------------------------------------------------------------------------------------

import { updateTransferStatusUI } from "./paginacion.js";

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

// Listen for transfer events globally
if (typeof window !== 'undefined') {
    window.addEventListener("transferComplete", (event) => {
        const { entries, fileName, duration, remoteDirectory } = event.detail;
        console.log(`🎉 Transfer complete for ${entries.length} entries`);
        console.log(`   File: ${fileName}`);
        console.log(`   Duration: ${duration}s`);
        console.log(`   Remote: ${remoteDirectory}`);
        
        // Store in history
        for (const entryData of entries) {
            transferHistory.set(entryData.entry, {
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
            transferHistory.set(entryData.entry, {
                status: "failed",
                error,
                timestamp: new Date().toISOString()
            });
        }
    });
}