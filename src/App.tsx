import React, { useState, useEffect, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import { Container, Navbar, Nav, Button, Tabs, Tab, ButtonGroup } from 'react-bootstrap';
import KeyList from './components/KeyList';
import RecentFilesList from './components/RecentFilesList';
import CompareTranslations from './components/CompareTranslations';
import './App.css';

import {
    TranslationFile,
    TranslationsMap,
    loadRecentFiles,
    saveRecentFile,
    getValueByPath,
    getAllKeys
} from './utils/fileUtils';

import { processDirectory, processSelectedFiles } from './utils/fileProcessUtils';
import {
    MemoizedTranslationEditor,
    TranslationEditorsPanel,
    WelcomePanel,
    SelectKeyPrompt
} from './components/OptimizedComponents';

const App: React.FC = () => {
    const [currentFile, setCurrentFile] = useState<TranslationFile | null>(null);
    const [translations, setTranslations] = useState<TranslationsMap | null>(null);
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [selectedKey, setSelectedKey] = useState<string[]>([]);
    const [recentFiles, setRecentFiles] = useState<string[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('edit');

    // Load recent files on component mount
    useEffect(() => {
        setRecentFiles(loadRecentFiles());
    }, []);

    // Memoize all keys for better performance
    const allKeys = useMemo(() => getAllKeys(currentFile, translations), [currentFile, translations]);

    // Memoize key selection handler
    const handleKeySelection = useCallback((key: string) => {
        setSelectedKey(key.split('.'));
    }, []);

    // Wrapper for saving recent files
    const handleSaveRecentFile = useCallback((filePath: string) => {
        const updatedFiles = saveRecentFile(filePath);
        setRecentFiles(updatedFiles);
    }, []);

    // Handler for opening recent files
    const handleOpenRecentFile = useCallback(async (filePath: string) => {
        alert(
            "In the web version, you cannot open recent files directly from the filesystem.\nPlease use the 'Open Folder' button to select files again."
        );
    }, []);

    // Save current file
    const handleSaveFile = useCallback(async () => {
        if (!currentFile) return;

        // Create a downloadable file
        const blob = new Blob([JSON.stringify(currentFile.content, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = currentFile.filePath;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setIsDirty(false);
    }, [currentFile]);

    // Save all translation files as a zip archive using JSZip
    const handleSaveAllFiles = useCallback(async () => {
        if (!translations) return;

        const zip = new JSZip();
        Object.entries(translations).forEach(([lang, translation]) => {
            zip.file(`${lang}.json`, JSON.stringify(translation.content, null, 2).replace(/\n/g, '\r\n'));
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'translations.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setIsDirty(false);
    }, [translations]);

    // Open a folder of translation files
    const handleOpenFolder = useCallback(async () => {
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
                    const newTranslations: TranslationsMap = {};
                    const folderName = dirHandle.name;

                    // Use the utility function to process the directory
                    await processDirectory(dirHandle, newTranslations);

                    if (Object.keys(newTranslations).length === 0) {
                        alert('No JSON translation files found in the selected folder or its subdirectories.');
                        return;
                    }

                    setCurrentFile(null);
                    setTranslations(newTranslations);
                    setCurrentFolder(folderName);
                    setSelectedKey([]);
                    setIsDirty(false);
                    handleSaveRecentFile(folderName);
                    return;
                } catch (err) {
                    console.log('Directory picker failed, falling back to file input', err);
                }
            }
        } catch (error) {
            console.error('Error with directory picker:', error);
        }

        // Fall back to regular file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.multiple = true;
        input.webkitdirectory = true;

        input.onchange = async (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (!files || files.length === 0) return;

            const newTranslations: TranslationsMap = {};

            // Process selected files using utility function
            const folderName = await processSelectedFiles(files, newTranslations);

            if (Object.keys(newTranslations).length === 0) {
                alert('No valid translation files were loaded. Please try again with JSON files.');
                return;
            }

            setCurrentFile(null);
            setTranslations(newTranslations);
            setCurrentFolder(folderName);
            setSelectedKey([]);
            setIsDirty(false);
            handleSaveRecentFile(folderName);
        };

        input.click();
    }, [currentFile, handleSaveFile, handleSaveAllFiles, handleSaveRecentFile, isDirty, translations]);

    // Update a translation value
    const handleUpdateTranslation = useCallback(
        (keyPath: string[], value: any, language?: string) => {
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
        },
        [currentFile, translations]
    );

    // Render the edit translations tab
    const renderEditTab = useCallback(() => {
        return (
            <div className="main-content">
                <div className="sidebar">
                    {currentFile || translations ? (
                        <KeyList
                            keys={allKeys}
                            selectedKey={selectedKey.join('.')}
                            onSelectKey={handleKeySelection}
                            nestedMode={true}
                        />
                    ) : (
                        <RecentFilesList files={recentFiles} onOpenFile={handleOpenRecentFile} />
                    )}
                </div>

                <div className="translation-container">
                    {currentFile && selectedKey.length > 0 && (
                        <MemoizedTranslationEditor
                            translations={translations}
                            translationKey={selectedKey.join('.')}
                            value={getValueByPath(currentFile.content, selectedKey)}
                            onUpdate={(value: any) => handleUpdateTranslation(selectedKey, value)}
                            handleUpdateTranslation={handleUpdateTranslation}
                        />
                    )}
                    {translations && selectedKey.length > 0 && (
                        <TranslationEditorsPanel
                            translations={translations}
                            selectedKey={selectedKey}
                            translationKeyDisplay={selectedKey.join('.')}
                            getValueByPath={getValueByPath}
                            handleUpdateTranslation={handleUpdateTranslation}
                        />
                    )}
                    {(currentFile || translations) && selectedKey.length === 0 && <SelectKeyPrompt />}
                    {!currentFile && !translations && <WelcomePanel />}
                </div>
            </div>
        );
    }, [
        allKeys,
        currentFile,
        translations,
        selectedKey,
        recentFiles,
        handleKeySelection,
        handleOpenRecentFile,
        handleUpdateTranslation
    ]);

    // Render the compare tab
    const renderCompareTab = useCallback(() => {
        return (
            <div className="p-3">
                <CompareTranslations onOpenFile={handleOpenRecentFile} />
            </div>
        );
    }, [handleOpenRecentFile]);

    // Render the auto-translation tab
    const renderBatchTranslationTab = useCallback(() => {
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
    }, []);

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
