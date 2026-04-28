 
import { SecureVault } from './SecureVault';
import { FiveTierDegradation } from './FiveTierDegradation';
import { HybridMind } from './HybridMind';

type Provider = 'gemini' | 'anthropic' | 'openai' | 'deepseek' | 'local';
type Capability = 'text' | 'vision' | 'code' | 'reasoning';

interface ProviderConfig {
    name: Provider;
    priority: number;
    capabilities: Capability[];
    minTier: number; 
}

export class MultiProviderRouter {
    private static queue: string[] = ['gemini-2.5-pro', 'claude-3-7-sonnet-20250219', 'o3'];
    private static readonly PROVIDERS: ProviderConfig[] = [
        { name: 'gemini',    priority: 1, capabilities: ['text','vision','code','reasoning'], minTier: 1 },
        { name: 'anthropic', priority: 2, capabilities: ['text','code','reasoning'],          minTier: 1 },
        { name: 'openai',    priority: 3, capabilities: ['text','vision','code','reasoning'], minTier: 1 },
        { name: 'deepseek',  priority: 4, capabilities: ['text','code','reasoning'],          minTier: 1 },
        { name: 'local',     priority: 5, capabilities: ['text','code'],                      minTier: 4 }, // Local ONLY allowed on Tier 4+
    ];

    static getQueue(): string[] {
        return [...this.queue];
    }

    static setQueue(newQueue: string[]): void {
        this.queue = newQueue;
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('saere-queue-updated', { detail: this.queue }));
        } else if (typeof self !== 'undefined' && 'postMessage' in self) {
            (self as any).postMessage({ type: 'SAERE_QUEUE_UPDATED', payload: this.queue });
        }
    }

    static async route(prompt: string, capability: Capability): Promise<string> {
        const tier = FiveTierDegradation.currentTier;
        const available = this.PROVIDERS
            .filter(p => p.capabilities.includes(capability))
            .filter(p => tier >= p.minTier) // Enforce cloud default, local only on high degradation
            .sort((a, b) => a.priority - b.priority);

        for (const provider of available) {
            try {
                return await this.callProvider(provider.name, prompt);
            } catch (_e) {
                console.warn(`[ROUTER] ${provider.name} failed, trying next...`);
            }
        }
        throw new Error('[ROUTER] All providers exhausted. Entering WITNESS tier.');
    }

    private static async callProvider(provider: Provider, prompt: string): Promise<string> {
        switch (provider) {
            case 'gemini': {
                const { GoogleGenAI } = await import('@google/genai');
                const apiKey = await SecureVault.getKey('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API_KEY;
                if (!apiKey) throw new Error('No Gemini API key');
                const genAI = new GoogleGenAI({ apiKey });
                const result = await genAI.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
                return result.text || '';
            }
            case 'anthropic': {
                const apiKey = await SecureVault.getKey('ANTHROPIC_KEY');
                if (!apiKey) throw new Error('No Anthropic API key');
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
                    body: JSON.stringify({ model: 'claude-3-7-sonnet-20250219', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] })
                });
                const data = await response.json();
                return data.content[0].text;
            }
            case 'openai': {
                const apiKey = await SecureVault.getKey('OPENAI_KEY');
                if (!apiKey) throw new Error('No OpenAI API key');
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'o3', messages: [{ role: 'user', content: prompt }] })
                });
                const data = await response.json();
                return data.choices[0].message.content;
            }
            case 'deepseek': {
                const apiKey = await SecureVault.getKey('DEEPSEEK_KEY');
                if (!apiKey) throw new Error('No DeepSeek API key');
                const response = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'deepseek-reasoner', messages: [{ role: 'user', content: prompt }] })
                });
                const data = await response.json();
                return data.choices[0].message.content;
            }
            case 'local':
                return HybridMind.queryLocal(prompt);
        }
    }
}
