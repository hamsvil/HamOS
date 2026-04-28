 
/* eslint-disable no-control-regex */
// AI Web Worker - Separate Thread for LLM Logic
import { GoogleGenAI } from "@google/genai";

// Cache instances by API key to avoid re-instantiating if not needed, but allow dynamic switching
const aiInstances = new Map<string, any>();

function getAiInstance(apiKey: string) {
    if (!apiKey) throw new Error("API Key is required");
    const sanitizedKey = apiKey.trim().replace(/[\s\n\r\t\x00-\x1F\x7F]/g, '');
    if (!aiInstances.has(sanitizedKey)) {
        aiInstances.set(sanitizedKey, new GoogleGenAI({ apiKey: sanitizedKey }));
    }
    return aiInstances.get(sanitizedKey);
}

self.onmessage = async (e: MessageEvent) => {
    const { type, payload, apiKey } = e.data;

    if (type === 'INIT') {
        try {
            if (apiKey) getAiInstance(apiKey);
            self.postMessage({ type: 'READY' });
        } catch (err: any) {
            self.postMessage({ type: 'ERROR', payload: err.message });
        }
        return;
    }

    if (type === 'GENERATE') {
        try {
            const ai = getAiInstance(apiKey);
            const { model, contents, config } = payload;
            const response = await ai.models.generateContent({
                model,
                contents,
                config
            });
            self.postMessage({ type: 'RESPONSE', payload: response.text });
        } catch (error: any) {
            self.postMessage({ type: 'ERROR', payload: error.message });
        }
    }

    if (type === 'GENERATE_STREAM') {
        try {
            const ai = getAiInstance(apiKey);
            const { model, contents, config } = payload;
            const responseStream = await ai.models.generateContentStream({
                model,
                contents,
                config
            });

            for await (const chunk of responseStream) {
                self.postMessage({ type: 'CHUNK', payload: chunk.text });
            }
            self.postMessage({ type: 'DONE' });
        } catch (error: any) {
            self.postMessage({ type: 'ERROR', payload: error.message });
        }
    }
};
