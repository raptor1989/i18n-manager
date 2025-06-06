import React, { useState } from 'react';
import {
    Button,
    Card,
    Form,
    Table,
    Badge,
    Tabs,
    Tab,
    Modal,
    Alert,
    ProgressBar,
    ButtonGroup
} from 'react-bootstrap';
import { translateText } from '../services/translationService';

interface CompareTranslationsProps {
    onOpenFile: (filePath: string) => void;
}

interface TranslationFile {
    filePath: string;
    content: Record<string, any>;
}

interface ComparisonResult {
    key: string;
    exists: { [lang: string]: boolean };
    types: { [lang: string]: string | undefined };
    path: string[];
}

const CompareTranslations: React.FC<CompareTranslationsProps> = ({ onOpenFile }) => {
    const [files, setFiles] = useState<{ [lang: string]: TranslationFile }>({});
    const [folderPath, setFolderPath] = useState<string | null>(null);
    const [results, setResults] = useState<ComparisonResult[]>([]);
    const [isComparing, setIsComparing] = useState(false);
    const [showMissingOnly, setShowMissingOnly] = useState(false);
    const [compareMode, setCompareMode] = useState<'two-files' | 'folder'>('two-files');

    // Auto-translation state
    const [showTranslateModal, setShowTranslateModal] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [translationProgress, setTranslationProgress] = useState(0);
    const [translationResults, setTranslationResults] = useState<{ success: number; failed: number }>({
        success: 0,
        failed: 0
    });
    const [apiKey, setApiKey] = useState('');
    const [sourceLang, setSourceLang] = useState('');
    const [targetLang, setTargetLang] = useState('');
    const [translateError, setTranslateError] = useState<string | null>(null);
    const [translateService, setTranslateService] = useState<'openai' | 'google' | 'azure'>('openai');

    const handleSelectFolder = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.multiple = true;
        input.webkitdirectory = true; // This enables directory selection in supported browsers
    
        input.onchange = async (e) => {
            const fileList = (e.target as HTMLInputElement).files;
            if (!fileList || fileList.length === 0) return;
    
            const newFiles: { [lang: string]: TranslationFile } = {};
            let folderName = "Translation Files"; // Default virtual folder name
    
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                
                // Skip non-JSON files
                if (!file.name.endsWith('.json')) continue;
                
                // Try to extract folder name from file paths
                if (file.webkitRelativePath) {
                    const pathParts = file.webkitRelativePath.split('/');
                    if (pathParts.length > 1) {
                        folderName = pathParts[0]; // Get top-level directory name
                    }
                    
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
                                
                                newFiles[lang] = {
                                    filePath: file.webkitRelativePath,
                                    content
                                };
                                
                                console.log(`Loaded ${file.webkitRelativePath} as language: ${lang}`);
                            } catch (error) {
                                console.error(`Error parsing file ${file.name}:`, error);
                            }
                            resolve();
                        };
                        reader.readAsText(file);
                    });
                }
            }
    
            if (Object.keys(newFiles).length === 0) {
                alert("No valid translation files found. Please select a folder with JSON translation files.");
                return;
            }
    
            setFiles(newFiles);
            setFolderPath(folderName);
        };
    
        // Try to use the directory picker API if available
        try {
            if ('showDirectoryPicker' in window) {
                try {
                    const dirHandle = await (window as any).showDirectoryPicker();
                    const newFiles: { [lang: string]: TranslationFile } = {};
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
                                    const pathParts = entryPath.split('/');
                                    let lang;
                                    
                                    if (pathParts.length >= 2) {
                                        // Use directory name as language code if in nested structure
                                        lang = pathParts[pathParts.length - 2];
                                    } else {
                                        // Otherwise use filename without extension
                                        lang = name.replace(/\.json$/i, '');
                                    }
                                    
                                    newFiles[lang] = {
                                        filePath: entryPath,
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
                    
                    if (Object.keys(newFiles).length === 0) {
                        alert("No JSON translation files found in the selected folder or its subdirectories.");
                        return;
                    }
                    
                    setFiles(newFiles);
                    setFolderPath(folderName);
                    return;
                } catch (err) {
                    console.log("Directory picker failed, falling back to file input", err);
                    // Fall back to file input
                }
            }
        } catch (error) {
            console.error("Error with directory picker:", error);
        }
        
        // Fall back to regular file input if directory picker isn't supported or fails
        input.click();
    };

    const compareTranslations = () => {
        if (compareMode === 'folder' && Object.keys(files).length === 0) return;

        setIsComparing(true);

        if (compareMode === 'two-files') {
            compareTwoFiles();
        } else {
            compareFolderFiles();
        }
    };

    // Rest of the comparison logic...

    // Get value from object by path array
    const getValueByPath = (obj: any, path: string[]): any => {
        if (!obj) return undefined;

        let current = obj;
        for (const key of path) {
            if (current === undefined || current === null) {
                return undefined;
            }
            current = current[key];
        }

        return current;
    };

    // Set value in object by path array
    const setValueByPath = (obj: any, path: string[], value: any): void => {
        if (!obj) return;

        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[path[path.length - 1]] = value;
    };

    const handleTranslate = async () => {
        if (!apiKey) {
            setTranslateError('API Key is required');
            return;
        }

        if (!sourceLang) {
            setTranslateError('Source language is required');
            return;
        }

        if (!targetLang) {
            setTranslateError('Target language is required');
            return;
        }

        setIsTranslating(true);
        setTranslationProgress(0);
        setTranslationResults({ success: 0, failed: 0 });
        setTranslateError(null);

        try {
            // Get missing translations based on compare mode
            const missingTranslations = getMissingTranslationsFolder();

            const totalKeys = missingTranslations.length;

            if (totalKeys === 0) {
                setTranslateError('No missing translations found');
                setIsTranslating(false);
                return;
            }

            let successCount = 0;
            let failedCount = 0;

            for (let i = 0; i < totalKeys; i++) {
                const item = missingTranslations[i];

                try {
                    const sourceValue = getValueByPath(files[sourceLang].content, item.path);

                    if (typeof sourceValue === 'string') {
                        const response = await translateText({
                            text: sourceValue,
                            sourceLang,
                            targetLang,
                            apiKey,
                            service: translateService
                        });

                        if (response.success) {
                            // Update target file with translation

                            setValueByPath(files[targetLang].content, item.path, response.translatedText);

                            // Update files state to trigger re-render
                            setFiles((prev) => ({
                                ...prev,
                                [targetLang]: {
                                    ...prev[targetLang],
                                    content: { ...prev[targetLang].content }
                                }
                            }));

                            successCount++;
                        } else {
                            console.error(`Translation failed for ${item.path.join('.')}:`, response.error);
                            failedCount++;
                        }
                    } else {
                        // Skip non-string values
                        failedCount++;
                    }
                } catch (error) {
                    console.error(`Error translating ${item.path.join('.')}:`, error);
                    failedCount++;
                }

                setTranslationProgress(Math.round(((i + 1) / totalKeys) * 100));
            }

            setTranslationResults({ success: successCount, failed: failedCount });

            // After translation is complete, refresh the comparison to show updated status
            compareTranslations();
        } catch (error) {
            console.error('Translation error:', error);
            setTranslateError(error instanceof Error ? error.message : 'An unknown error occurred');
        } finally {
            setIsTranslating(false);
        }
    };

    const getMissingTranslationsFolder = () => {
        if (Object.keys(files).length === 0 || !files[sourceLang] || !files[targetLang]) return [];

        return results
            .filter(
                (result) =>
                    result.exists[sourceLang] &&
                    !result.exists[targetLang] &&
                    typeof getValueByPath(files[sourceLang].content, result.path) === 'string'
            )
            .map((result) => ({
                path: result.path,
                value: getValueByPath(files[sourceLang].content, result.path)
            }));
    };

    // Helper functions to retain
    const compareTwoFiles = () => {
        const comparisonResults: ComparisonResult[] = [];

        const processObject = (obj1: any, obj2: any, currentPath: string[] = []) => {
            const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

            allKeys.forEach((key) => {
                const keyPath = [...currentPath, key];
                const val1 = obj1?.[key];
                const val2 = obj2?.[key];
                const exists1 = obj1 !== undefined && key in obj1;
                const exists2 = obj2 !== undefined && key in obj2;
                const type1 = val1 !== undefined ? (Array.isArray(val1) ? 'array' : typeof val1) : undefined;
                const type2 = val2 !== undefined ? (Array.isArray(val2) ? 'array' : typeof val2) : undefined;

                if (type1 === 'object' && type2 === 'object' && !Array.isArray(val1) && !Array.isArray(val2)) {
                    processObject(val1, val2, keyPath);
                } else {
                    comparisonResults.push({
                        key,
                        exists: { file1: exists1, file2: exists2 },
                        types: { file1: type1, file2: type2 },
                        path: keyPath
                    });
                }
            });
        };

        setResults(comparisonResults);
        setIsComparing(false);
    };

    const compareFolderFiles = () => {
        if (Object.keys(files).length === 0) return;

        const comparisonResults: ComparisonResult[] = [];
        const languages = Object.keys(files);

        // Create a map of all keys from all files
        const allPaths = new Set<string>();

        const extractPaths = (obj: any, currentPath: string[] = []): void => {
            if (!obj || typeof obj !== 'object') return;

            Object.entries(obj).forEach(([key, value]) => {
                const keyPath = [...currentPath, key];
                allPaths.add(keyPath.join('.'));

                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    extractPaths(value, keyPath);
                }
            });
        };

        // Extract all paths from all language files
        languages.forEach((lang) => {
            extractPaths(files[lang].content);
        });

        // Process each unique path and check across all language files
        Array.from(allPaths).forEach((pathStr) => {
            const path = pathStr.split('.');
            const key = path[path.length - 1];

            const exists: { [lang: string]: boolean } = {};
            const types: { [lang: string]: string | undefined } = {};

            languages.forEach((lang) => {
                let value = files[lang].content;
                let pathExists = true;

                // Navigate through the path
                for (const part of path) {
                    if (value === undefined || value === null || typeof value !== 'object') {
                        pathExists = false;
                        break;
                    }
                    value = value[part];
                }

                exists[lang] = pathExists && value !== undefined;
                types[lang] = value !== undefined ? (Array.isArray(value) ? 'array' : typeof value) : undefined;
            });

            comparisonResults.push({
                key,
                exists,
                types,
                path
            });
        });

        setResults(comparisonResults);
        setIsComparing(false);
    };

    const getFileName = (filePath: string) => {
        const parts = filePath.split(/[\\\/]/);
        return parts[parts.length - 1];
    };

    const getKeyPath = (result: ComparisonResult) => {
        return result.path.join('.');
    };

    const getStatusBadge = (result: ComparisonResult) => {
        if (compareMode === 'two-files') {
            if (!result.exists['file1']) {
                return <Badge bg="danger">Missing in File 1</Badge>;
            }
            if (!result.exists['file2']) {
                return <Badge bg="warning">Missing in File 2</Badge>;
            }
            if (result.types['file1'] !== result.types['file2']) {
                return <Badge bg="info">Type Mismatch</Badge>;
            }
            return <Badge bg="success">Ok</Badge>;
        } else {
            // Count missing entries
            const missingCount = Object.values(result.exists).filter((exists) => !exists).length;
            const totalLangs = Object.keys(result.exists).length;

            // Check for type mismatches
            const types = new Set(Object.values(result.types).filter((t) => t !== undefined));

            if (missingCount === totalLangs) {
                return <Badge bg="danger">Missing in All Languages</Badge>;
            } else if (missingCount > 0) {
                return <Badge bg="warning">Missing in {missingCount} Languages</Badge>;
            } else if (types.size > 1) {
                return <Badge bg="info">Type Mismatch</Badge>;
            }
            return <Badge bg="success">Ok</Badge>;
        }
    };

    const getFilteredResults = () => {
        if (!showMissingOnly) return results;

        if (compareMode === 'two-files') {
            return results.filter(
                (r) => !r.exists['file1'] || !r.exists['file2'] || r.types['file1'] !== r.types['file2']
            );
        } else {
            return results.filter((r) => {
                const missingInSome = Object.values(r.exists).some((exists) => !exists);

                // Check for type mismatches
                const types = new Set(Object.values(r.types).filter((t) => t !== undefined));
                const typeMismatch = types.size > 1;

                return missingInSome || typeMismatch;
            });
        }
    };

    // Save translated files
    const handleSaveTranslatedFiles = async () => {
        try {
            if (compareMode === 'folder') {
                // Save each file individually
                Object.entries(files).forEach(([lang, file]) => {
                    const blob = new Blob([JSON.stringify(file.content, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.filePath;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                });
                alert('All files saved successfully!');
            }
        } catch (error) {
            console.error('Error saving translations:', error);
            alert('Error saving translations. See console for details.');
        }
    };

    return (
        <div className="compare-container">
            <Card className="mb-4">
                <Card.Header>Compare Translation Files</Card.Header>
                <Card.Body>
                    <Tabs
                        activeKey={compareMode}
                        onSelect={(key) => setCompareMode(key as 'two-files' | 'folder')}
                        className="mb-3"
                    >
                        <Tab eventKey="folder" title="Compare All Languages">
                            <div className="mb-3">
                                <Button variant="primary" onClick={handleSelectFolder} className="mb-2">
                                    Select Translation Folder
                                </Button>
                                {folderPath && (
                                    <div className="text-muted small">
                                        {folderPath} ({Object.keys(files).length} languages)
                                    </div>
                                )}
                            </div>
                        </Tab>
                    </Tabs>

                    <Button
                        variant="success"
                        onClick={compareTranslations}
                        disabled={(compareMode === 'folder' && Object.keys(files).length === 0) || isComparing}
                        className="mt-2"
                    >
                        {isComparing ? 'Comparing...' : 'Compare Files'}
                    </Button>
                </Card.Body>
            </Card>

            {results.length > 0 && (
                <>
                    <div className="mb-3 d-flex justify-content-between align-items-center">
                        <h5>Comparison Results</h5>
                        <div className="d-flex">
                            <Form.Check
                                type="switch"
                                id="show-missing-only"
                                label="Show issues only"
                                checked={showMissingOnly}
                                onChange={(e) => setShowMissingOnly(e.target.checked)}
                                className="me-2"
                            />
                            <ButtonGroup>
                                <Button variant="outline-primary" onClick={() => setShowTranslateModal(true)}>
                                    Auto-Translate
                                </Button>
                                <Button variant="outline-success" onClick={handleSaveTranslatedFiles}>
                                    Save Changes
                                </Button>
                            </ButtonGroup>
                        </div>
                    </div>

                    <Table striped bordered hover size="sm">
                        <thead>
                            <tr>
                                <th>Key Path</th>
                                <th>Status</th>
                                {compareMode === 'folder' && <th>Languages</th>}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getFilteredResults().map((result, index) => (
                                <tr key={index}>
                                    <td>{getKeyPath(result)}</td>
                                    <td>{getStatusBadge(result)}</td>

                                    {compareMode === 'folder' && (
                                        <td>
                                            {Object.entries(result.exists).map(([lang, exists]) => (
                                                <Badge
                                                    key={lang}
                                                    bg={exists ? 'success' : 'danger'}
                                                    className="me-1 mb-1"
                                                >
                                                    {lang}: {exists ? 'Yes' : 'No'}
                                                </Badge>
                                            ))}
                                        </td>
                                    )}

                                    <td>
                                        <div className="d-flex flex-wrap">
                                            {Object.entries(result.exists).map(([lang, exists]) => (
                                                <Button
                                                    key={lang}
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => onOpenFile(files[lang].filePath)}
                                                    disabled={!exists}
                                                    className="me-1 mb-1"
                                                >
                                                    {lang}
                                                </Button>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </>
            )}

            <Modal show={showTranslateModal} onHide={() => !isTranslating && setShowTranslateModal(false)} size="lg">
                <Modal.Header closeButton={!isTranslating}>
                    <Modal.Title>Auto-Translate Missing Keys</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Translation Service</Form.Label>
                            <Form.Select
                                value={translateService}
                                onChange={(e) => setTranslateService(e.target.value as 'openai' | 'google' | 'azure')}
                                disabled={isTranslating}
                            >
                                <option value="openai">OpenAI (GPT)</option>
                                <option value="google">Google Translate</option>
                                <option value="azure">Azure Translator</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>API Key</Form.Label>
                            <Form.Control
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                disabled={isTranslating}
                                placeholder="Enter your API key"
                            />
                            <Form.Text className="text-muted">
                                Your API key is not stored or transmitted outside of this application.
                            </Form.Text>
                        </Form.Group>

                        <div className="row">
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label>Source Language</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={sourceLang}
                                        onChange={(e) => setSourceLang(e.target.value)}
                                        disabled={isTranslating}
                                        placeholder="e.g., en, fr, de"
                                    />
                                    {compareMode === 'folder' && (
                                        <Form.Select
                                            className="mt-2"
                                            value={sourceLang}
                                            onChange={(e) => setSourceLang(e.target.value)}
                                            disabled={isTranslating}
                                        >
                                            <option value="">Select a language</option>
                                            {Object.keys(files).map((lang) => (
                                                <option key={lang} value={lang}>
                                                    {lang}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    )}
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label>Target Language</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={targetLang}
                                        onChange={(e) => setTargetLang(e.target.value)}
                                        disabled={isTranslating}
                                        placeholder="e.g., en, fr, de"
                                    />
                                    {compareMode === 'folder' && (
                                        <Form.Select
                                            className="mt-2"
                                            value={targetLang}
                                            onChange={(e) => setTargetLang(e.target.value)}
                                            disabled={isTranslating}
                                        >
                                            <option value="">Select a language</option>
                                            {Object.keys(files).map((lang) => (
                                                <option key={lang} value={lang}>
                                                    {lang}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    )}
                                </Form.Group>
                            </div>
                        </div>
                    </Form>

                    {translateError && <Alert variant="danger">{translateError}</Alert>}

                    {isTranslating && (
                        <div className="mt-4">
                            <p className="mb-2">Translating...</p>
                            <ProgressBar animated now={translationProgress} label={`${translationProgress}%`} />
                        </div>
                    )}

                    {!isTranslating && translationResults.success + translationResults.failed > 0 && (
                        <Alert variant={translationResults.failed > 0 ? 'warning' : 'success'} className="mt-3">
                            <p className="mb-1">
                                <strong>Translation Results:</strong>
                            </p>
                            <p className="mb-1">✅ Successfully translated: {translationResults.success} keys</p>
                            {translationResults.failed > 0 && (
                                <p className="mb-1">❌ Failed to translate: {translationResults.failed} keys</p>
                            )}
                        </Alert>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowTranslateModal(false)} disabled={isTranslating}>
                        Close
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleTranslate}
                        disabled={isTranslating || !apiKey || !sourceLang || !targetLang}
                    >
                        {isTranslating ? 'Translating...' : 'Start Translation'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default CompareTranslations;
