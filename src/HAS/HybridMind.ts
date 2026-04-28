 
// Local WASM-based AI fallback — SAERE never truly dies

export class HybridMind {
    private static model: any = null;
    private static isLoading = false;

    static async init(): Promise<void> {
        if (this.model || this.isLoading) return;
        this.isLoading = true;
        try {
            // Load quantized model via WASM (llama.cpp WASM build)
            // Model: Phi-3.5 Mini Q4 (~2GB) or Qwen-0.5B Q4 (~400MB)
            let LlamaModel;
            try {
                // @ts-ignore - Module may not be installed in all environments
                const moduleName = '@llama.cpp/server/wasm';
                const mod = await import(/* @vite-ignore */ moduleName);
                LlamaModel = mod.LlamaModel;
            } catch (_e) {
                console.warn('[HYBRID_MIND] @llama.cpp/server/wasm not found. Using mock fallback.');
                LlamaModel = {
                    load: async () => ({
                        complete: async (prompt: string) => `[MOCK LOCAL RESPONSE] I am running in fallback mode because the local WASM model failed to load. Prompt: ${prompt}`
                    })
                };
            }
            this.model = await LlamaModel.load({
                modelPath: '/models/phi-3.5-mini-instruct.Q4_K_M.gguf',
                contextSize: 2048,
                threads: navigator.hardwareConcurrency || 4,
            });
        } catch (e) {
            console.warn('[HYBRID_MIND] Local model unavailable:', e);
        } finally {
            this.isLoading = false;
        }
    }

    static async queryLocal(prompt: string): Promise<string> {
        if (!this.model) {
            await this.init();
            if (!this.model) throw new Error('[HYBRID_MIND] Local model not available');
        }
        return this.model.complete(`[INST] ${prompt} [/INST]`, { maxTokens: 512, temperature: 0.1 });
    }

    static isAvailable(): boolean {
        return this.model !== null;
    }
}
