

import { GoogleGenAI, GenerationConfig, Content, Type, Modality } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '../systemInstruction';
import { Flashcard } from '../types';

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getChatSession = (modelName: string = 'gemini-2.5-flash', config: Partial<GenerationConfig> = {}, history: Content[]) => {
    return ai.chats.create({
        model: modelName,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            ...config,
        },
        history: history || [],
    });
};

export const sendMessage = async (message: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: message,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
        }
    });
    return response.text || '';
};

export const generateImage = async (title: string, content: string): Promise<string | null> => {
    try {
        const imagePrompt = `Create a single, photo-realistic banner image for a business case study about a company named "${title}". The image will be displayed in a wide banner format, cropping the top and bottom.
**Composition is critical to avoid key details being cut off.**
- **Focal Point:** The absolute most important visual element (e.g., the business's sign, the main product, or the owner's face) MUST be perfectly centered, both horizontally and vertically.
- **Safe Zone:** All other essential elements MUST be placed within the central 50% of the image's height to ensure they are not cropped.
- **Content:** The image should feature the business owner(s) or key employees up-close and prominent, smiling. The business name "${title}" should be clearly visible. The background should show the business's activity.
- **Style:** High-quality and photo-realistic to make the case study feel real.
- **AVOID:** Do not place any important content near the top or bottom edges.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: imagePrompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        
        const base64 = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
        return base64 ? `data:image/png;base64,${base64}` : null;
    } catch (error) {
        console.error('Error generating image:', error);
        return null;
    }
};

const voiceMap: Record<string, { voiceName: string; instruction?: string }> = {
  standard: { voiceName: 'Fenrir' },
  villain: {
    voiceName: 'Puck',
    instruction: "Adopt the persona of a classic Russian Evil Villain—a cold, calculating mastermind with a thick Russian accent. Your tone must be sinister, cold, and condescending. Speak slowly and deliberately. Say:"
  }
};

export const generateSpeech = async (text: string, voiceKey: string = 'standard'): Promise<string | null> => {
    try {
        const voiceConfig = voiceMap[voiceKey] || voiceMap['standard'];
        const finalText = voiceConfig.instruction ? `${voiceConfig.instruction} "${text}"` : text;
        const voiceName = voiceConfig.voiceName;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: finalText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName as any } } },
            },
        });
        const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64 || null;
    } catch (error) {
        console.error('Error generating speech:', error);
        return null;
    }
};

export const generateSpeechForSentences = async (text: string, voiceKey: string = 'standard'): Promise<(string[] | null)> => {
    const sentences: string[] = text.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length === 0 && text.trim().length > 0) {
        sentences.push(text.trim());
    }
    if (sentences.length === 0) return [];

    try {
        const audioPromises = sentences.map(sentence => generateSpeech(sentence.trim(), voiceKey));
        const audioResults = await Promise.all(audioPromises);
        const validAudio = audioResults.filter((audio): audio is string => audio !== null);
        return validAudio;
    } catch (error) {
        console.error('Error generating speech for sentences:', error);
        return null;
    }
};

export const extractTextFromImages = async (base64Images: string[]): Promise<string | null> => {
    try {
        const parts: any[] = base64Images.map(img => {
            const mimeType = img.match(/data:(.*);base64,/)?.[1] || 'image/jpeg';
            const base64Data = img.split(',')[1] || img;
            return {
                inlineData: {
                    mimeType,
                    data: base64Data
                }
            };
        });
        
        parts.push({
            text: "Please extract all handwritten text from these images. Return ONLY the extracted text. If the image is blurry, unreadable, or contains no text, return exactly this string: 'POOR_QUALITY_IMAGE'."
        });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
        });
        return response.text || null;
    } catch (error) {
        console.error('Error extracting text:', error);
        return null;
    }
};

export const generateFlashcards = async (topic: string): Promise<Flashcard[]> => {
    try {
        const prompt = `Create a set of 10 GCSE Business flashcards on the topic of "${topic}". 
Return the output as a JSON array of objects with "front" and "back" keys.
Example: [{"front": "What is profit?", "back": "Total revenue minus total costs."}]`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            front: { type: Type.STRING },
                            back: { type: Type.STRING },
                        },
                        required: ["front", "back"],
                    },
                },
            },
        });
        
        const flashcards: Flashcard[] = JSON.parse(response.text || '[]');
        return Array.isArray(flashcards) ? flashcards : [];
    } catch (error) {
        console.error('Error generating flashcards:', error);
        return [];
    }
};

