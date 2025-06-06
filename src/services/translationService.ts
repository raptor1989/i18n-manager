export interface TranslationOptions {
    text: string;
    sourceLang: string;
    targetLang: string;
    apiKey: string;
    service?: 'openai' | 'google' | 'azure';
}

export interface TranslationResponse {
    translatedText: string;
    success: boolean;
    error?: string;
}

/**
 * Translates text using OpenAI's API
 */
async function translateWithOpenAI(options: TranslationOptions): Promise<TranslationResponse> {
    try {
        const { text, sourceLang, targetLang, apiKey } = options;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}. 
                      Preserve all formatting and special characters. Return ONLY the translated text without any explanations.`
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000
            })
        });

        const data = await response.json();

        if (response.ok) {
            return {
                translatedText: data.choices[0].message.content.trim(),
                success: true
            };
        } else {
            return {
                translatedText: '',
                success: false,
                error: data.error?.message || 'Unknown error occurred during translation'
            };
        }
    } catch (error) {
        return {
            translatedText: '',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred during translation'
        };
    }
}

/**
 * Translates text using Google Translate API
 */
async function translateWithGoogle(options: TranslationOptions): Promise<TranslationResponse> {
    try {
        const { text, sourceLang, targetLang, apiKey } = options;

        const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                q: text,
                source: sourceLang,
                target: targetLang,
                format: 'text'
            })
        });

        const data = await response.json();

        if (response.ok && data.data?.translations?.length > 0) {
            return {
                translatedText: data.data.translations[0].translatedText,
                success: true
            };
        } else {
            return {
                translatedText: '',
                success: false,
                error: data.error?.message || 'Unknown error occurred during translation'
            };
        }
    } catch (error) {
        return {
            translatedText: '',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred during translation'
        };
    }
}

/**
 * Translates text using Azure Translator API
 */
async function translateWithAzure(options: TranslationOptions): Promise<TranslationResponse> {
    try {
        const { text, sourceLang, targetLang, apiKey } = options;

        const response = await fetch(
            'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0' +
                `&from=${sourceLang}&to=${targetLang}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': apiKey,
                    'Ocp-Apim-Subscription-Region': 'westeurope'
                },
                body: JSON.stringify([
                    {
                        text
                    }
                ])
            }
        );

        const data = await response.json();

        if (response.ok && data[0]?.translations?.length > 0) {
            return {
                translatedText: data[0].translations[0].text,
                success: true
            };
        } else {
            return {
                translatedText: '',
                success: false,
                error: data.error?.message || 'Unknown error occurred during translation'
            };
        }
    } catch (error) {
        return {
            translatedText: '',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred during translation'
        };
    }
}

/**
 * Main translation function that delegates to the appropriate service
 */
export async function translateText(options: TranslationOptions): Promise<TranslationResponse> {
    const { service = 'openai' } = options;

    switch (service) {
        case 'google':
            return translateWithGoogle(options);
        case 'azure':
            return translateWithAzure(options);
        case 'openai':
        default:
            return translateWithOpenAI(options);
    }
}

/**
 * Utility function to detect the language of a text
 */
export async function detectLanguage(text: string, apiKey: string): Promise<string> {
    try {
        // This is a simplistic implementation - in a real app, you would use a proper language detection API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content:
                            'Detect the language of the following text. Return ONLY the ISO 639-1 language code (like "en", "fr", "de", etc.).'
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.3,
                max_tokens: 10
            })
        });

        const data = await response.json();

        if (response.ok) {
            return data.choices[0].message.content.trim().toLowerCase();
        }

        return 'en'; // Default to English if detection fails
    } catch (error) {
        console.error('Error detecting language:', error);
        return 'en'; // Default to English if detection fails
    }
}
