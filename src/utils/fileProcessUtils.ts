// File processing utilities for efficient folder loading

/**
 * Process a directory recursively to extract translation files
 */
export async function processDirectory(
    handle: any, 
    translations: Record<string, any>,
    path: string = ''
) {
    for await (const [name, entry] of handle.entries()) {
        const entryPath = path ? `${path}/${name}` : name;
        
        if (entry.kind === 'directory') {
            // Process subdirectory
            await processDirectory(entry, translations, entryPath);
        } else if (entry.kind === 'file' && name.endsWith('.json')) {
            try {
                const file = await entry.getFile();
                const text = await file.text();
                const content = JSON.parse(text);
                
                // Extract language code from path
                // For structure like translations/pl/translate.json, use "pl" as language
                const pathParts = entryPath.split('/');
                let lang;
                
                if (pathParts.length >= 2) {
                    // Use directory name as language code if in nested structure
                    lang = pathParts[pathParts.length - 2];
                } else {
                    // Otherwise use filename without extension
                    lang = name.replace(/\.json$/i, '');
                }
                
                translations[lang] = {
                    filePath: entryPath, // Store full relative path
                    content
                };
                console.log(`Loaded ${entryPath} as language: ${lang}`);
            } catch (error) {
                console.error(`Error processing file ${entryPath}:`, error);
            }
        }
    }
}

/**
 * Process files selected from file picker
 */
export async function processSelectedFiles(
    files: FileList,
    translations: Record<string, any>
) {
    let folderName = "Translation Files"; // Default virtual folder name
            
    // Process each file
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Try to extract folder name from file paths
        if (file.webkitRelativePath) {
            const pathParts = file.webkitRelativePath.split('/');
            if (pathParts.length > 1) {
                folderName = pathParts[0];
            }
            
            // Only process JSON files
            if (!file.name.endsWith('.json')) continue;
            
            await new Promise<void>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const content = JSON.parse(e.target?.result as string);
                        
                        // For nested paths like "translations/pl/translate.json"
                        // Use the directory name ("pl") as the language code
                        let lang;
                        if (pathParts.length >= 3) {
                            // Use directory name as language code
                            lang = pathParts[pathParts.length - 2];
                        } else {
                            // Otherwise use filename without extension
                            lang = file.name.replace(/\.json$/i, '');
                        }
                        
                        translations[lang] = {
                            filePath: file.webkitRelativePath,
                            content
                        };
                        
                        console.log(`Loaded ${file.webkitRelativePath} as language: ${lang}`);
                        resolve();
                    } catch (error) {
                        console.error(`Error parsing JSON file ${file.name}:`, error);
                        alert(`Failed to parse ${file.name}. Make sure it contains valid JSON.`);
                        resolve();
                    }
                };
                reader.readAsText(file);
            });
        }
    }
    
    return folderName;
}
