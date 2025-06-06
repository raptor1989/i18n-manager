import React, { useState, useEffect } from 'react';
import { Container, Navbar, Nav, Button, Tabs, Tab, ButtonGroup } from 'react-bootstrap';
import TranslationEditor from './components/TranslationEditor';
import KeyList from './components/KeyList';
import RecentFilesList from './components/RecentFilesList';
import CompareTranslations from './components/CompareTranslations';
import './App.css';

// Local storage key for recent files
const RECENT_FILES_STORAGE_KEY = 'i18n_manager_recent_files';

interface TranslationData {
    [key: string]: any;
}

interface TranslationFile {
    filePath: string;
    content: TranslationData;
}

interface TranslationsMap {
    [language: string]: TranslationFile;
}

const App: React.FC = () => {
    const [currentFile, setCurrentFile] = useState<TranslationFile | null>(null);
    const [translations, setTranslations] = useState<TranslationsMap | null>(null);
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [selectedKey, setSelectedKey] = useState<string[]>([]);
    const [recentFiles, setRecentFiles] = useState<string[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('edit');

    useEffect(() => {
        loadRecentFiles();
    }, []);

    const loadRecentFiles = () => {
        try {
            const files = localStorage.getItem(RECENT_FILES_STORAGE_KEY);
            if (files) {
                setRecentFiles(JSON.parse(files));
            }
        } catch (error) {
            console.error('Error loading recent files:', error);
        }
    };

    const saveRecentFile = (filePath: string) => {
        try {
            let files = JSON.parse(localStorage.getItem(RECENT_FILES_STORAGE_KEY) || '[]');
            // Remove if already exists
            files = files.filter((file: string) => file !== filePath);
            // Add to start 
            files.unshift(filePath);
            // Keep only last 10 files
            files = files.slice(0, 10);
            localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(files));
            setRecentFiles(files);
        } catch (error) {
            console.error('Error saving recent file:', error);
        }
    };

    // Modified to work with multiple file selection
    const handleOpenFolder = async () => {
        // If there are unsaved changes, prompt the user
        if (isDirty) {
            const confirmSave = window.confirm(
                'You have unsaved changes. Do you want to save them before opening a new folder?'
            );
            if (confirmSave) {
                if (translations) {
                    await handleSaveAllFiles();
                } else if (currentFile) {
                    await handleSaveFile();
                }
            }
        }
        
        try {
            // Try to use the directory picker API if available
            if ('showDirectoryPicker' in window) {
                try {
                    const dirHandle = await (window as any).showDirectoryPicker();
                    const translations: TranslationsMap = {};
                    const folderName = dirHandle.name;
                    
                    // Recursively process all files in the directory and its subdirectories
                    async function processDirectory(handle: any, path: string = '') {
                        for await (const [name, entry] of handle.entries()) {
                            const entryPath = path ? `${path}/${name}` : name;
                            
                            if (entry.kind === 'directory') {
                                // Process subdirectory
                                await processDirectory(entry, entryPath);
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
                    
                    await processDirectory(dirHandle);
                    
                    if (Object.keys(translations).length === 0) {
                        alert("No JSON translation files found in the selected folder or its subdirectories.");
                        return;
                    }
                    
                    setCurrentFile(null);
                    setTranslations(translations);
                    setCurrentFolder(folderName);
                    setSelectedKey([]);
                    setIsDirty(false);
                    saveRecentFile(folderName);
                    return;
                } catch (err) {
                    console.log("Directory picker failed, falling back to file input", err);
                    // Fall back to file input if directory picker fails
                }
            }
        } catch (error) {
            console.error("Error with directory picker:", error);
        }
        
        // Fall back to regular file input if directory picker isn't supported or fails
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.multiple = true;
        input.webkitdirectory = true; // This enables directory selection in some browsers
        
        input.onchange = async (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (!files || files.length === 0) return;
    
            const translations: TranslationsMap = {};
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
            
            if (Object.keys(translations).length === 0) {
                alert("No valid translation files were loaded. Please try again with JSON files.");
                return;
            }
            
            setCurrentFile(null);
            setTranslations(translations);
            setCurrentFolder(folderName);
            setSelectedKey([]);
            setIsDirty(false);
            saveRecentFile(folderName);
        };
        
        input.click();
    };

    const handleOpenRecentFile = async (filePath: string) => {
        alert("In the web version, you cannot open recent files directly from the filesystem.\nPlease use the 'Open Folder' button to select files again.");
    };

    const handleSaveFile = async () => {
        if (!currentFile) return;

        // Create a downloadable file
        const blob = new Blob([JSON.stringify(currentFile.content)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFile.filePath;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setIsDirty(false);
    };

    // Modified to save all files as a zip in web version
    const handleSaveAllFiles = async () => {
        if (!translations) return;

        // In a web version, we'll save each file individually
        Object.entries(translations).forEach(([lang, translation]) => {
            const blob = new Blob([JSON.stringify(translation.content, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${lang}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
        
        setIsDirty(false);
    };

    // Provide sample translations directly in the code
    const handleLoadSamples = async () => {
        // If there are unsaved changes, prompt the user
        if (isDirty) {
            const confirmSave = window.confirm(
                'You have unsaved changes. Do you want to save them before opening sample translations?'
            );
            if (confirmSave) {
                if (translations) {
                    await handleSaveAllFiles();
                } else if (currentFile) {
                    await handleSaveFile();
                }
            }
        }

        // Sample translations
        const sampleTranslations: TranslationsMap = {
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

        setCurrentFile(null);
        setTranslations(sampleTranslations);
        setCurrentFolder("Sample Translations");
        setSelectedKey([]);
        setIsDirty(false);
    };

    // Modified to support nested paths
    const handleUpdateTranslation = (keyPath: string[], value: any, language?: string) => {
        if (translations && language) {
            // Update a specific language translation
            setTranslations((prev) => {
                if (!prev || !prev[language]) return prev;

                const updatedContent = { ...prev[language].content };
                let current = updatedContent;

                // Navigate to the nested object
                for (let i = 0; i < keyPath.length - 1; i++) {
                    if (!current[keyPath[i]] || typeof current[keyPath[i]] !== 'object') {
                        current[keyPath[i]] = {};
                    }
                    current = current[keyPath[i]];
                }

                // Set the value at the final key
                current[keyPath[keyPath.length - 1]] = value;

                return {
                    ...prev,
                    [language]: {
                        ...prev[language],
                        content: updatedContent
                    }
                };
            });
        } else if (currentFile) {
            // Update a single file (legacy mode)
            setCurrentFile((prev) => {
                if (!prev) return null;

                const updatedContent = { ...prev.content };
                let current = updatedContent;

                // Navigate to the nested object
                for (let i = 0; i < keyPath.length - 1; i++) {
                    if (!current[keyPath[i]] || typeof current[keyPath[i]] !== 'object') {
                        current[keyPath[i]] = {};
                    }
                    current = current[keyPath[i]];
                }

                // Set the value at the final key
                current[keyPath[keyPath.length - 1]] = value;

                return {
                    ...prev,
                    content: updatedContent
                };
            });
        }

        setIsDirty(true);
    };

    // Helper function to get all keys from translations objects including nested keys
    const getAllKeys = () => {
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

    // Extract nested keys with dot notation
    const extractKeys = (obj: any, prefix = ''): string[] => {
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

    // Helper to get a value by path
    const getValueByPath = (obj: any, path: string[]): any => {
        let current = obj;

        for (const key of path) {
            if (current === undefined || current === null) {
                return undefined;
            }
            current = current[key];
        }

        return current;
    };

    const renderEditTab = () => {
        return (
            <div className="main-content">
                <div className="sidebar">
                    {currentFile || translations ? (
                        <KeyList
                            keys={getAllKeys()}
                            selectedKey={selectedKey.join('.')}
                            onSelectKey={(key: string) => setSelectedKey(key.split('.'))}
                            nestedMode={true}
                        />
                    ) : (
                        <RecentFilesList files={recentFiles} onOpenFile={handleOpenRecentFile} />
                    )}
                </div>

                <div className="translation-container">
                    {currentFile && selectedKey.length > 0 && (
                        // Single file mode
                        <TranslationEditor
                            translationKey={selectedKey.join('.')}
                            value={getValueByPath(currentFile.content, selectedKey)}
                            onUpdate={(value: any) => handleUpdateTranslation(selectedKey, value)}
                        />
                    )}
                    {translations && selectedKey.length > 0 && (
                        // Multiple languages mode with improved UI
                        <div className="all-languages-container">
                            <div className="translation-path">Editing: {selectedKey.join('.')}</div>

                            <div className="row">
                                {Object.entries(translations).map(([lang, translation]) => (
                                    <div key={lang} className="col-lg-6 mb-3">
                                        <TranslationEditor
                                            translationKey={selectedKey.join('.')}
                                            value={getValueByPath(translation.content, selectedKey)}
                                            onUpdate={(value: any) => handleUpdateTranslation(selectedKey, value, lang)}
                                            language={lang}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {(currentFile || translations) && selectedKey.length === 0 && (
                        <div className="text-center mt-5">
                            <p>Select a translation key from the sidebar to edit it.</p>
                        </div>
                    )}
                    {!currentFile && !translations && (
                        <div className="text-center mt-5">
                            <h4>Welcome to i18n Manager</h4>
                            <p>Open a translation file or folder to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderCompareTab = () => {
        return (
            <div className="p-3">
                <CompareTranslations onOpenFile={handleOpenRecentFile} />
            </div>
        );
    };

    // New tab for batch auto-translation
    const renderBatchTranslationTab = () => {
        return (
            <div className="p-3">
                <div className="alert alert-info">
                    <h4>AI Auto-Translation</h4>
                    <p>
                        This feature allows you to automatically translate missing keys in your translation files using
                        AI-powered translation services.
                    </p>
                    <p>You can use this feature in two ways:</p>
                    <ul>
                        <li>
                            In the <strong>Compare Files</strong> tab, click on the <strong>Auto-Translate</strong>{' '}
                            button to translate missing keys.
                        </li>
                        <li>
                            In the <strong>Edit Translations</strong> tab, use the <strong>AI Translate</strong> button
                            next to any text field to translate individual entries.
                        </li>
                    </ul>
                    <p>Supported translation services:</p>
                    <ul>
                        <li>
                            <strong>OpenAI</strong> - Uses GPT models for high-quality translations
                        </li>
                        <li>
                            <strong>Google Translate</strong> - Google's translation API
                        </li>
                        <li>
                            <strong>Azure Translator</strong> - Microsoft's translation service
                        </li>
                    </ul>
                    <p className="mb-0">
                        <strong>Note:</strong> You'll need to provide your own API key for the translation service you
                        choose.
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="app-container">
            <Navbar bg="dark" variant="dark">
                <Container fluid>
                    <Navbar.Brand>i18n Manager</Navbar.Brand>
                    <Nav className="me-auto">
                        <ButtonGroup className="me-2">
                            <Button variant="outline-light" onClick={handleOpenFolder}>
                                Open Folder
                            </Button>
                        </ButtonGroup>
                        {currentFile && activeTab === 'edit' && (
                            <Button variant="outline-light" onClick={handleSaveFile} disabled={!isDirty}>
                                Save File
                            </Button>
                        )}
                        {translations && activeTab === 'edit' && (
                            <Button variant="outline-light" onClick={handleSaveAllFiles} disabled={!isDirty}>
                                Save All Files
                            </Button>
                        )}
                    </Nav>
                    {currentFile && activeTab === 'edit' && (
                        <Navbar.Text className="text-light">
                            {currentFile.filePath} {isDirty ? '(Unsaved Changes)' : ''}
                        </Navbar.Text>
                    )}
                    {translations && activeTab === 'edit' && (
                        <Navbar.Text className="text-light">
                            {currentFolder} ({Object.keys(translations).length} languages){' '}
                            {isDirty ? '(Unsaved Changes)' : ''}
                        </Navbar.Text>
                    )}
                </Container>
            </Navbar>

            <Tabs
                activeKey={activeTab}
                onSelect={(key) => setActiveTab(key || 'edit')}
                className="mb-0 px-3 pt-2 bg-light"
                id="main-tabs"
            >
                <Tab eventKey="edit" title="Edit Translations">
                    {renderEditTab()}
                </Tab>
                <Tab eventKey="compare" title="Compare Files">
                    {renderCompareTab()}
                </Tab>
                <Tab eventKey="auto-translate" title="Auto-Translation">
                    {renderBatchTranslationTab()}
                </Tab>
            </Tabs>
        </div>
    );
};

export default App;
