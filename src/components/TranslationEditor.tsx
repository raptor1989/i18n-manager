import React, { useState, useEffect } from 'react';
import { Form, Badge, Button, Spinner, Modal } from 'react-bootstrap';
import { translateText } from '../services/translationService';
import { getValueByPath, TranslationFile } from '@/utils/fileUtils';

interface TranslationEditorProps {
    translationKey: string;
    value: any;
    onUpdate: (value: any) => void;
    language?: string;
    translations: Record<string, TranslationFile> | null;
    handleUpdateTranslation?: (keyPath: string[], value: any, language?: string) => void;
}

const TranslationEditor: React.FC<TranslationEditorProps> = ({
    translationKey,
    value,
    onUpdate,
    language,
    translations,
    handleUpdateTranslation
}) => {
    const [currentValue, setCurrentValue] = useState<string>('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [showTranslateModal, setShowTranslateModal] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [sourceLang, setSourceLang] = useState('en');
    const [sourceText, setSourceText] = useState('');
    const [service, setService] = useState<'openai' | 'google' | 'azure'>('azure');

    // For bulk translation
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkApiKey, setBulkApiKey] = useState('');
    const [bulkSourceLang, setBulkSourceLang] = useState('');
    const [bulkTargetLangs, setBulkTargetLangs] = useState<string[]>([]); // all possible targets
    const [bulkSelectedTargets, setBulkSelectedTargets] = useState<string[]>([]); // user-selected
    const [bulkIsTranslating, setBulkIsTranslating] = useState(false);
    const [bulkService, setBulkService] = useState<'openai' | 'google' | 'azure'>('azure');

    const selectedKey = translationKey?.split('.');

    useEffect(() => {
        // Convert different value types to string for editing
        if (typeof value === 'string') {
            setCurrentValue(value);
        } else if (value === null || value === undefined) {
            setCurrentValue('');
        } else {
            // For objects or arrays, convert to JSON string
            setCurrentValue(JSON.stringify(value, null, 2));
        }
    }, [value]);

    // When opening the bulk modal, auto-select source and targets for the current key
    const handleOpenBulkModal = () => {
        if (!translations || typeof translations !== 'object') {
            setShowBulkModal(true);
            return;
        }
        // Find all languages for this key
        const langs = Object.keys(translations);
        // Find source: first language with a non-empty value for this key
        let foundSource = language || '';
        // Find targets: all languages where value is empty/undefined/null for this key
        const targets = langs.filter(
            (lang) =>
                lang !== foundSource &&
                (getValueByPath(translations[lang]?.content, selectedKey) === undefined ||
                    getValueByPath(translations[lang]?.content, selectedKey) === null ||
                    getValueByPath(translations[lang]?.content, selectedKey) === '')
        );
        setBulkSourceLang(foundSource);
        setBulkTargetLangs(targets);
        setBulkSelectedTargets(targets);
        setShowBulkModal(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setCurrentValue(e.target.value);
    };

    const handleBlur = () => {
        // Try to parse as JSON if it seems like JSON
        if (currentValue.trim() === '') {
            onUpdate('');
            return;
        }

        if (currentValue.trim().startsWith('{') || currentValue.trim().startsWith('[')) {
            try {
                const jsonValue = JSON.parse(currentValue);
                onUpdate(jsonValue);
                return;
            } catch (e) {
                // Not valid JSON, treat as a string
                console.log('Not valid JSON:', e);
            }
        }

        // Handle numeric values
        if (!isNaN(Number(currentValue)) && currentValue.trim() !== '') {
            onUpdate(Number(currentValue));
            return;
        }

        // Handle boolean values
        if (currentValue.trim().toLowerCase() === 'true') {
            onUpdate(true);
            return;
        }

        if (currentValue.trim().toLowerCase() === 'false') {
            onUpdate(false);
            return;
        }

        // Default case: treat as a string
        onUpdate(currentValue);
    };

    // Handle translation request
    const handleTranslate = async () => {
        if (!apiKey || !sourceLang || !sourceText) {
            return;
        }

        setIsTranslating(true);

        try {
            const response = await translateText({
                text: sourceText,
                sourceLang,
                targetLang: language || 'en',
                apiKey,
                service: service
            });

            if (response.success) {
                setCurrentValue(response.translatedText);
                onUpdate(response.translatedText);
            } else {
                console.error('Translation failed:', response.error);
                alert(`Translation failed: ${response.error}`);
            }
        } catch (error) {
            console.error('Translation error:', error);
            alert('An error occurred during translation.');
        } finally {
            setIsTranslating(false);
            setShowTranslateModal(false);
        }
    };

    // Bulk translate for this key: translate to all selected target languages
    const handleBulkTranslate = async () => {
        if (!bulkApiKey || !bulkSourceLang || bulkSelectedTargets.length === 0) return;
        setBulkIsTranslating(true);
        try {
            if (!translations || !translations[bulkSourceLang]) {
                alert('Translations not available for selected languages.');
                setBulkIsTranslating(false);
                return;
            }
            const sourceVal = getValueByPath(translations[bulkSourceLang]?.content, selectedKey);

            if (!sourceVal) {
                alert('No source value found for this key.');
                setBulkIsTranslating(false);
                return;
            }
            for (const targetLang of bulkSelectedTargets) {
                const targetContent = translations[targetLang]?.content;
                if (!targetContent) continue;
                const response = await translateText({
                    text: sourceVal,
                    sourceLang: bulkSourceLang,
                    targetLang: targetLang,
                    apiKey: bulkApiKey,
                    service: bulkService
                });
                if (response.success) {
                    handleUpdateTranslation?.(selectedKey, response.translatedText, targetLang);
                } else {
                    console.error('Bulk translation failed for', targetLang, response.error);
                }
            }
            alert('Bulk translation completed. Please review the translations.');
            setShowBulkModal(false);
        } catch (e) {
            alert('Bulk translation error: ' + e);
        } finally {
            setBulkIsTranslating(false);
        }
    };

    // Determine if the value is defined or not
    const isValueDefined = value !== undefined && value !== null;

    return (
        <div className={language ? 'language-block' : 'single-editor'}>
            {!language ? (
                <div className="translation-path">{translationKey}</div>
            ) : (
                <h5>
                    {language}
                    {!isValueDefined && (
                        <Badge bg="warning" className="ms-2">
                            Missing
                        </Badge>
                    )}
                </h5>
            )}

            <Form.Group className="mb-3">
                {!language && <Form.Label>Translation Value</Form.Label>}
                {!isValueDefined && (
                    <div className="translation-missing mb-2">Translation not defined in this language</div>
                )}
                {(currentValue && currentValue.length > 80) ||
                currentValue.includes('\n') ||
                (typeof value === 'object' && value !== null) ? (
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={currentValue}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder={!isValueDefined ? 'Add translation...' : ''}
                    />
                ) : (
                    <Form.Control
                        type="text"
                        value={currentValue}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder={!isValueDefined ? 'Add translation...' : ''}
                    />
                )}
            </Form.Group>

            <div className="d-flex justify-content-between align-items-start">
                <div className="text-muted small">
                    <p>Type: {value === undefined ? 'Undefined' : Array.isArray(value) ? 'Array' : typeof value}</p>
                    {typeof value === 'object' && value !== null && !Array.isArray(value) && (
                        <p>Keys: {Object.keys(value).join(', ')}</p>
                    )}
                </div>

                {language && typeof value === 'string' && (
                    <>
                        <Button size="sm" variant="outline-primary" onClick={() => setShowTranslateModal(true)}>
                            AI Translate
                        </Button>
                        <Button
                            size="sm"
                            variant="outline-success"
                            className="ms-2"
                            onClick={() => handleOpenBulkModal()}
                        >
                            Translate all empty
                        </Button>
                    </>
                )}
            </div>

            {/* Translation Modal */}
            <Modal show={showTranslateModal} onHide={() => !isTranslating && setShowTranslateModal(false)}>
                <Modal.Header closeButton={!isTranslating}>
                    <Modal.Title>AI Translate</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
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
                        <Form.Group className="mb-3">
                            <Form.Label>Service</Form.Label>
                            <Form.Select
                                value={service}
                                onChange={(e) => setService(e.target.value as 'openai' | 'google' | 'azure')}
                                disabled={isTranslating}
                            >
                                <option value="openai">OpenAI</option>
                                <option value="google">Google</option>
                                <option value="azure">Azure</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Source Language</Form.Label>
                            <Form.Control
                                type="text"
                                value={sourceLang}
                                onChange={(e) => setSourceLang(e.target.value)}
                                disabled={isTranslating}
                                placeholder="e.g., en, fr, de"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Text to Translate</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={sourceText}
                                onChange={(e) => setSourceText(e.target.value)}
                                disabled={isTranslating}
                                placeholder="Enter text to translate"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Target Language</Form.Label>
                            <Form.Control type="text" value={language || 'en'} disabled={true} />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowTranslateModal(false)} disabled={isTranslating}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleTranslate}
                        disabled={isTranslating || !apiKey || !sourceText || !sourceLang}
                    >
                        {isTranslating ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-1" />
                                Translating...
                            </>
                        ) : (
                            'Translate'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Bulk Translate Modal */}
            <Modal show={showBulkModal} onHide={() => !bulkIsTranslating && setShowBulkModal(false)}>
                <Modal.Header closeButton={!bulkIsTranslating}>
                    <Modal.Title>Translate All Empty</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>API Key</Form.Label>
                            <Form.Control
                                type="password"
                                value={bulkApiKey}
                                onChange={(e) => setBulkApiKey(e.target.value)}
                                disabled={bulkIsTranslating}
                                placeholder="Enter your API key"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Service</Form.Label>
                            <Form.Select
                                value={bulkService}
                                onChange={(e) => setBulkService(e.target.value as 'openai' | 'google' | 'azure')}
                                disabled={bulkIsTranslating}
                            >
                                <option value="openai">OpenAI</option>
                                <option value="google">Google</option>
                                <option value="azure">Azure</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Source Language</Form.Label>
                            <Form.Control type="text" value={bulkSourceLang} disabled={true} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Target Languages</Form.Label>
                            <div>
                                {bulkTargetLangs.length === 0 && <div>No target languages found for this key.</div>}
                                {bulkTargetLangs.map((lang) => (
                                    <Form.Check
                                        key={lang}
                                        type="checkbox"
                                        label={lang}
                                        value={lang}
                                        checked={bulkSelectedTargets.includes(lang)}
                                        disabled={bulkIsTranslating}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setBulkSelectedTargets((prev) => [...prev, lang]);
                                            } else {
                                                setBulkSelectedTargets((prev) => prev.filter((l) => l !== lang));
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowBulkModal(false)} disabled={bulkIsTranslating}>
                        Cancel
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleBulkTranslate}
                        disabled={
                            bulkIsTranslating || !bulkApiKey || !bulkSourceLang || bulkSelectedTargets.length === 0
                        }
                    >
                        {bulkIsTranslating ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-1" />
                                Translating...
                            </>
                        ) : (
                            'Translate all empty'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default TranslationEditor;
