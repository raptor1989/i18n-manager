/**
 * Utility functions for file operations and translations
 */

interface TranslationData {
    [key: string]: any;
}

export interface TranslationFile {
    filePath: string;
    content: TranslationData;
}

export interface TranslationsMap {
    [language: string]: TranslationFile;
}

// Local storage key for recent files
export const RECENT_FILES_STORAGE_KEY = 'i18n_manager_recent_files';

/**
 * Load recent files from local storage
 */
export const loadRecentFiles = (): string[] => {
    try {
        const files = localStorage.getItem(RECENT_FILES_STORAGE_KEY);
        return files ? JSON.parse(files) : [];
    } catch (error) {
        console.error('Error loading recent files:', error);
        return [];
    }
};

/**
 * Save a file path to recent files list
 */
export const saveRecentFile = (filePath: string): string[] => {
    try {
        let files = JSON.parse(localStorage.getItem(RECENT_FILES_STORAGE_KEY) || '[]');
        // Remove if already exists
        files = files.filter((file: string) => file !== filePath);
        // Add to start 
        files.unshift(filePath);
        // Keep only last 10 files
        files = files.slice(0, 10);
        localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(files));
        return files;
    } catch (error) {
        console.error('Error saving recent file:', error);
        return [];
    }
};

/**
 * Extract nested keys with dot notation
 */
export const extractKeys = (obj: any, prefix = ''): string[] => {
    if (!obj || typeof obj !== 'object') {
        return [];
    }

    return Object.entries(obj).flatMap(([key, value]) => {
        const currentKey = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return [currentKey, ...extractKeys(value, currentKey)];
        }

        return [currentKey];
    });
};

/**
 * Get a value from an object by path array
 */
export const getValueByPath = (obj: any, path: string[]): any => {
    let current = obj;

    for (const key of path) {
        if (current === undefined || current === null) {
            return undefined;
        }
        current = current[key];
    }

    return current;
};

/**
 * Get all keys from translation objects including nested keys
 */
export const getAllKeys = (
    currentFile: TranslationFile | null, 
    translations: TranslationsMap | null
): string[] => {
    if (currentFile) {
        return extractKeys(currentFile.content);
    } else if (translations) {
        // Combine keys from all language files
        const allKeys = new Set<string>();

        Object.values(translations).forEach((translation) => {
            extractKeys(translation.content).forEach((key) => {
                allKeys.add(key);
            });
        });

        return Array.from(allKeys);
    }

    return [];
};

/**
 * Sample translations for demo
 */
export const getSampleTranslations = (): TranslationsMap => {
    return {
        en: {
            filePath: 'en.json',
            content: {
                common: {
                    welcome: "Welcome to i18n Manager",
                    greeting: "Hello, {{name}}!",
                    buttons: {
                        save: "Save",
                        cancel: "Cancel",
                        submit: "Submit"
                    }
                },
                pages: {
                    home: {
                        title: "Home Page",
                        description: "This is the home page"
                    },
                    about: {
                        title: "About Us",
                        description: "Learn more about our company"
                    }
                }
            }
        },
        es: {
            filePath: 'es.json',
            content: {
                common: {
                    welcome: "Bienvenido a i18n Manager",
                    greeting: "¡Hola, {{name}}!",
                    buttons: {
                        save: "Guardar",
                        cancel: "Cancelar",
                        submit: "Enviar"
                    }
                },
                pages: {
                    home: {
                        title: "Página de inicio",
                        description: "Esta es la página de inicio"
                    },
                    about: {
                        title: "Sobre Nosotros",
                        description: "Aprende más sobre nuestra empresa"
                    }
                }
            }
        },
        fr: {
            filePath: 'fr.json',
            content: {
                common: {
                    welcome: "Bienvenue sur i18n Manager",
                    greeting: "Bonjour, {{name}} !",
                    buttons: {
                        save: "Enregistrer",
                        cancel: "Annuler",
                        submit: "Soumettre"
                    }
                },
                pages: {
                    home: {
                        title: "Page d'accueil",
                        description: "C'est la page d'accueil"
                    },
                    about: {
                        title: "À propos de nous",
                        description: "En savoir plus sur notre entreprise"
                    }
                }
            }
        }
    };
};
