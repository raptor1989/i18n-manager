/**
 * Components for optimizing the i18n manager UI
 */
import React, { memo } from 'react';
import { TranslationFile } from '../utils/fileUtils';
import TranslationEditor from './TranslationEditor';

// Memoized translation editor component to prevent unnecessary re-renders
export const MemoizedTranslationEditor = memo(TranslationEditor);

interface TranslationEditorsPanelProps {
    translations: Record<string, TranslationFile>;
    selectedKey: string[];
    translationKeyDisplay: string;
    getValueByPath: (obj: any, path: string[]) => any;
    handleUpdateTranslation: (keyPath: string[], value: any, language?: string) => void;
}

// Component for rendering all language editors
export const TranslationEditorsPanel = memo(({
    translations,
    selectedKey,
    translationKeyDisplay,
    getValueByPath,
    handleUpdateTranslation
}: TranslationEditorsPanelProps) => {
    return (
        <div className="all-languages-container">
            <div className="translation-path">Editing: {translationKeyDisplay}</div>

            <div className="row">
                {Object.entries(translations).map(([lang, translation]) => (
                    <div key={lang} className="col-lg-6 mb-3">
                        <MemoizedTranslationEditor
                            translations={translations}
                            translationKey={translationKeyDisplay}
                            value={getValueByPath(translation.content, selectedKey)}
                            onUpdate={(value: any) => handleUpdateTranslation(selectedKey, value, lang)}
                            handleUpdateTranslation={handleUpdateTranslation}
                            language={lang}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
});

// Component for welcome message when no file is loaded
export const WelcomePanel = memo(() => (
    <div className="text-center mt-5">
        <h4>Welcome to i18n Manager</h4>
        <p>Open a translation file or folder to get started.</p>
    </div>
));

// Component for prompt to select a key
export const SelectKeyPrompt = memo(() => (
    <div className="text-center mt-5">
        <p>Select a translation key from the sidebar to edit it.</p>
    </div>
));
