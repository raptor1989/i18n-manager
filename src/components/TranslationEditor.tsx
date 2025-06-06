import React, { useState, useEffect } from 'react';
import { Form, Badge, Button, Spinner, Modal } from 'react-bootstrap';
import { translateText } from '../services/translationService';

interface TranslationEditorProps {
    translationKey: string;
    value: any;
    onUpdate: (value: any) => void;
    language?: string;
}

const TranslationEditor: React.FC<TranslationEditorProps> = ({ translationKey, value, onUpdate, language }) => {
    const [currentValue, setCurrentValue] = useState<string>('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [showTranslateModal, setShowTranslateModal] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [sourceLang, setSourceLang] = useState('en');
    const [sourceText, setSourceText] = useState('');

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
                service: 'openai'
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
                    <Button size="sm" variant="outline-primary" onClick={() => setShowTranslateModal(true)}>
                        AI Translate
                    </Button>
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
                            <Form.Label>API Key (OpenAI)</Form.Label>
                            <Form.Control
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                disabled={isTranslating}
                                placeholder="Enter your OpenAI API key"
                            />
                            <Form.Text className="text-muted">
                                Your API key is not stored or transmitted outside of this application.
                            </Form.Text>
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
        </div>
    );
};

export default TranslationEditor;
