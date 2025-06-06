// File saving utilities

/**
 * Save content as a downloadable JSON file
 */
export function saveAsJson(content: any, filename: string) {
    // Create a pretty-printed JSON blob with indentation
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Helper function for cleaner code with using the JSON save functionality
 */
export function downloadJsonFile(content: any, filename: string): void {
    saveAsJson(content, filename);
}

/**
 * Helper to create a zip file from multiple JSON files
 * Note: This would require a library like JSZip to implement fully
 */
export function createMultiFileDownload(files: Record<string, any>): void {
    // For now, just download each file individually
    Object.entries(files).forEach(([filename, content]) => {
        downloadJsonFile(content, `${filename}.json`);
    });
}
