/* eslint-disable no-useless-assignment */
/* eslint-disable no-case-declarations */
/* eslint-disable no-useless-escape */
/* eslint-disable no-control-regex */
// [ARCHITECTURE] File is large. Consider splitting into smaller modules.
import { GoogleGenAI } from "@google/genai";
import { SupremeClient } from "../services/supremeClient";

if (typeof SharedArrayBuffer === 'undefined') {
    const polyfill = ArrayBuffer;
    (globalThis as any).SharedArrayBuffer = polyfill;
    (self as any).SharedArrayBuffer = polyfill;
}

const aiInstances = new Map<string, GoogleGenAI>();

function getAiInstance(apiKey: string) {
    if (!apiKey) throw new Error("API Key is required");
    // Sanitize key to remove whitespace and hidden characters
    const sanitizedKey = apiKey.trim().replace(/[\s\n\r\t\x00-\x1F\x7F]/g, '');
    if (!sanitizedKey) throw new Error("API Key is invalid after sanitization");
    
    const key = `gemini:${sanitizedKey}`;
    if (!aiInstances.has(key)) {
        aiInstances.set(key, new GoogleGenAI({ apiKey: sanitizedKey }));
    }
    return aiInstances.get(key)!;
}

// Context Optimizer for Semantic RAG Preparation
class ContextOptimizer {
    static optimize(context: string, maxTokens: number = 1000000): string {
        // Basic optimization: if context is too large, we truncate or extract signatures.
        // In a full RAG system, this would query a Vector DB.
        // For now, we ensure it doesn't exceed a reasonable character limit (approx tokens * 4)
        const maxChars = maxTokens * 4;
        if (context.length <= maxChars) return context;
        
        // Truncate from the beginning (assuming recent files are appended at the end)
        // Or better, keep the file structure but truncate contents.
        return "[TRUNCATED CONTEXT]\n" + context.substring(context.length - maxChars);
    }
}

// CNC: Continuous Neural Compilation
class CNC {
    private buffer: string = "";
    private declaredVariables: Set<string> = new Set();
    private isAborted: boolean = false;
    private lastParseTime: number = 0;

    constructor(context: string) {
        // Pre-populate declared variables from context
        const varRegex = /(?:const|let|var|function|class|interface|type|enum)\s+([a-zA-Z0-9_$]+)/g;
        let match;
        while ((match = varRegex.exec(context)) !== null) {
            this.declaredVariables.add(match[1]);
        }
    }

    public abort() {
        this.isAborted = true;
    }

    public get aborted() {
        return this.isAborted;
    }

    public processChunk(chunk: string): { valid: boolean; error?: string } {
        if (this.isAborted) return { valid: false, error: "Already aborted" };
        this.buffer += chunk;
        
        const now = Date.now();
        const isEndOfBlock = chunk.includes('```');
        
        // Throttle parsing to every 500ms or end of block to prevent O(N^2) CPU burn
        if (now - this.lastParseTime < 500 && !isEndOfBlock) {
            return { valid: true };
        }
        this.lastParseTime = now;

        // Simple check for code blocks
        const codeBlockMatch = this.buffer.match(/```(?:typescript|javascript|tsx|jsx)?\n([\s\S]*?)(?:```|$)/);
        if (codeBlockMatch && codeBlockMatch[1]) {
            const code = codeBlockMatch[1];
            
            // 1. Strict Syntax Check on complete blocks (Removed acorn because it fails on valid TypeScript)
            
            // 2. Regex-based variable check for faster mid-flight detection
            const variableRegex = /(?:const|let|var|function|class|interface|type|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
            const blockDefined = new Set<string>();
            let vMatch;
            while ((vMatch = variableRegex.exec(code)) !== null) {
                blockDefined.add(vMatch[1]);
            }

            // ANTI-PANGKAS (Anti-Pruning) Protocol
            const pruningPatterns = [
                /\/\/\s*\.\.\./,
                /\/\/\s*rest\s+of\s+code/,
                /\/\/\s*implement\s+logic/,
                /\/\/\s*existing\s+code/,
                /\/\*\s*\.\.\.\s*\*\//
            ];
            if (pruningPatterns.some(pattern => pattern.test(code))) {
                return { valid: false, error: "ANTI-PANGKAS VIOLATION: Placeholder or truncated code detected. You MUST output the COMPLETE code." };
            }

            // ANTI-SIMULASI (Anti-Simulation) Protocol
            const simulationPatterns = [
                /mock/,
                /simulate/,
                /placeholder\s+data/,
                /fake\s+api/
            ];
            // Only check if it's not a test file
            if (!this.buffer.includes('test') && simulationPatterns.some(pattern => pattern.test(code.toLowerCase()))) {
                // This is a soft check, maybe just warn or log?
                // For now, let's keep it strict if it looks like a core service
                if (code.includes('Service') || code.includes('Engine')) {
                    // return { valid: false, error: "ANTI-SIMULASI VIOLATION: Mock or simulation detected in core service. Use real implementation." };
                }
            }

            const usageRegex = /\b([a-zA-Z0-9_$]+)\b(?!\s*:)/g;
            let match;
            while ((match = usageRegex.exec(code)) !== null) {
                const varName = match[1];
                // Ignore keywords and common globals
                if (['if', 'else', 'for', 'while', 'return', 'import', 'export', 'from', 'const', 'let', 'var', 'function', 'class', 'console', 'window', 'document', 'process', 'require', 'module', 'exports', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Promise', 'Error', 'JSON', 'Math', 'Date', 'RegExp', 'Map', 'Set', 'Uint8Array', 'SharedArrayBuffer', 'await', 'async', 'true', 'false', 'null', 'undefined', 'NaN', 'Infinity', 'default', 'switch', 'case', 'break', 'continue', 'typeof', 'instanceof', 'void', 'delete', 'new', 'this', 'super', 'catch', 'finally', 'throw', 'debugger', 'with', 'yield', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'static', 'enum', 'type', 'namespace', 'declare', 'module', 'any', 'unknown', 'never', 'string', 'number', 'boolean', 'symbol', 'object', 'Record', 'Partial', 'Omit', 'Pick', 'Exclude', 'Extract', 'NonNullable', 'Parameters', 'ConstructorParameters', 'ReturnType', 'InstanceType', 'Required', 'Readonly'].includes(varName)) continue;
                
                // If variable is used but not declared in context or in current block
                if (!this.declaredVariables.has(varName) && !blockDefined.has(varName)) {
                    // Check if it's a property access (e.g., obj.varName)
                    const index = match.index;
                    if (index > 0 && code[index - 1] === '.') continue;
                    
                    // Possible hallucination
                    return { valid: false, error: `Variable or Type "${varName}" is used but not defined in context.` };
                }
            }
        }
        return { valid: true };
    }
}

// SharedArrayBuffer for Zero-Copy Context
let sharedContextBuffer: SharedArrayBuffer | null = null;
let sharedContextView: Uint8Array | null = null;
let fallbackContextString: string = "";

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, apiKeys, apiKey, id, provider = 'gemini' } = e.data;
  
  // Support legacy apiKey or new apiKeys object
  const keys = apiKeys || { [provider]: apiKey };

  if (type === 'INIT' && keys) {
    try {
      if (keys.gemini) getAiInstance(keys.gemini);
      if (payload?.sharedBuffer) {
          sharedContextBuffer = payload.sharedBuffer;
          sharedContextView = new Uint8Array(sharedContextBuffer!);
      }
      if (payload?.contextString) {
          fallbackContextString = payload.contextString;
      }
      self.postMessage({ type: 'READY', id });
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', payload: err.message, id });
    }
    return;
  }

  switch (type) {
    case 'UPDATE_KEYS':
      const { apiKeys: newKeys } = e.data;
      if (newKeys) {
          if (newKeys.gemini) getAiInstance(newKeys.gemini);
      }
      return;
    case 'GENERATE_STREAM':
      try {
        const providersToTry = ['gemini'].filter(p => keys[p]);
        
        if (providersToTry.length === 0) {
            throw new Error(`Gemini API Key is missing, invalid, or exhausted. Please check your API key in Settings (Gear Icon -> AI Models).`);
        }
        
        let lastError: any = null;
        let success = false;

        for (const currentProvider of providersToTry) {
            if (success) break;
            
            const currentApiKey = keys[currentProvider];
            if (!currentApiKey) {
                if (!lastError) lastError = new Error(`API Key for ${currentProvider} is missing.`);
                continue;
            }
            
            const ai = getAiInstance(currentApiKey);
            let modelName = payload.model || 'gemini-2.0-flash';
            
            let contextStr = fallbackContextString;
            if (sharedContextView) {
                const decoder = new TextDecoder();
                let end = 0;
                while (end < sharedContextView.length && sharedContextView[end] !== 0) end++;
                contextStr = decoder.decode(sharedContextView.subarray(0, end));
            }
            contextStr = ContextOptimizer.optimize(contextStr);

            let retryCount = 0;
            const maxRetries = 2;
            let currentContents = JSON.parse(JSON.stringify(payload.contents));
            
            if (contextStr) {
                const contextPrompt = `\n\n[SHARED PROJECT CONTEXT]\n${contextStr}\n[/SHARED PROJECT CONTEXT]`;
                if (typeof currentContents === 'string') {
                    currentContents += contextPrompt;
                } else if (Array.isArray(currentContents) && currentContents.length > 0) {
                    const lastMsg = currentContents[currentContents.length - 1];
                    if (lastMsg.role === 'user') {
                        if (Array.isArray(lastMsg.parts)) {
                            lastMsg.parts.push({ text: contextPrompt });
                        } else if (typeof lastMsg.parts === 'string') {
                            lastMsg.parts += contextPrompt;
                        }
                    }
                }
            }

            while (retryCount <= maxRetries && !success) {
                const cnc = new CNC(contextStr);
                let fullResponse = "";
                let abortError = "";

                try {
                    if (currentProvider === 'gemini') {
                        const responseStream = await ai.models.generateContentStream({
                          model: modelName,
                          contents: currentContents,
                          config: {
                              ...(payload.config || {}),
                              safetySettings: payload.safetySettings,
                              tools: payload.tools,
                              toolConfig: payload.toolConfig
                          }
                        });

                        for await (const chunk of responseStream) {
                          if (cnc.aborted) break;
                          const text = chunk.text || "";
                          fullResponse += text;
                          
                          const validation = cnc.processChunk(text);
                          if (!validation.valid) {
                              cnc.abort();
                              abortError = validation.error || "Unknown CNC Error";
                              break;
                          }

                          self.postMessage({ 
                              type: 'CHUNK', 
                              payload: text, 
                              groundingMetadata: chunk.candidates?.[0]?.groundingMetadata,
                              functionCalls: chunk.functionCalls,
                              id 
                          });
                        }
                    }

                    if (cnc.aborted) {
                        retryCount++;
                        if (retryCount <= maxRetries) {
                            const truncatedError = abortError.length > 500 ? abortError.substring(0, 500) + "..." : abortError;
                            self.postMessage({ type: 'RETRYING', payload: `Self-healing triggered. Fixing error: ${truncatedError}`, id });
                            
                            const errorPrompt = `\n\n[SYSTEM: PREVIOUS GENERATION FAILED]\nYour previous code failed validation with error: ${truncatedError}. Please fix this error and generate the code again. Ensure all variables and types are properly defined or imported.`;
                            
                            if (typeof currentContents === 'string') {
                                currentContents += errorPrompt;
                            } else if (Array.isArray(currentContents)) {
                                const lastMsg = currentContents[currentContents.length - 1];
                                if (lastMsg.role === 'user') {
                                    if (Array.isArray(lastMsg.parts)) {
                                        lastMsg.parts.push({ text: errorPrompt });
                                    } else if (typeof lastMsg.parts === 'string') {
                                        lastMsg.parts += errorPrompt;
                                    }
                                } else {
                                    currentContents.push({ role: 'user', parts: [{ text: errorPrompt }] });
                                }
                            }
                        } else {
                            lastError = new Error(`Failed after ${maxRetries} retries. Last error: ${abortError}`);
                            break; // Try next provider
                        }
                    } else {
                        // Final LSP Validation for Stream
                        const isCodeFile = fullResponse.includes('// FILE:') || fullResponse.includes('<code path=');
                        
                        if (isCodeFile) {
                            const lspValidationPromise = new Promise<{valid: boolean, error?: string}>((resolve) => {
                                const listener = (e: MessageEvent) => {
                                    if (e.data.type === 'LSP_VALIDATE_RESPONSE' && e.data.id === id) {
                                        self.removeEventListener('message', listener);
                                        resolve(e.data.payload);
                                    }
                                };
                                self.addEventListener('message', listener);
                                self.postMessage({ type: 'LSP_VALIDATE_REQUEST', payload: fullResponse, id });
                            });
                            
                            const lspResult = await lspValidationPromise;
                            if (!lspResult.valid) {
                                retryCount++;
                                if (retryCount <= maxRetries) {
                                    const truncatedLspError = lspResult.error && lspResult.error.length > 500 ? lspResult.error.substring(0, 500) + "..." : lspResult.error;
                                    self.postMessage({ type: 'RETRYING', payload: `LSP Validation failed. Fixing error: ${truncatedLspError}`, id });
                                    
                                    const errorPrompt = `\n\n[SYSTEM: PREVIOUS GENERATION FAILED]\nYour previous code failed LSP validation with error: ${truncatedLspError}. Please fix this error and generate the code again. Ensure all variables and types are properly defined or imported.`;
                                    
                                    if (typeof currentContents === 'string') {
                                        currentContents += errorPrompt;
                                    } else if (Array.isArray(currentContents)) {
                                        const lastMsg = currentContents[currentContents.length - 1];
                                        if (lastMsg.role === 'user') {
                                            if (Array.isArray(lastMsg.parts)) {
                                                lastMsg.parts.push({ text: errorPrompt });
                                            } else if (typeof lastMsg.parts === 'string') {
                                                lastMsg.parts += errorPrompt;
                                            }
                                        } else {
                                            currentContents.push({ role: 'user', parts: [{ text: errorPrompt }] });
                                        }
                                    }
                                    continue;
                                } else {
                                    lastError = new Error(`Failed after ${maxRetries} retries. Last error: ${lspResult.error}`);
                                    break; // Try next provider
                                }
                            }
                        }

                        success = true;
                        self.postMessage({ type: 'DONE', id });
                    }
                } catch (err: any) {
                    lastError = err;
                    console.error(`[AI Worker] Provider ${currentProvider} failed:`, err);
                    break; // Try next provider
                }
            }
        }

        if (!success) {
            throw lastError || new Error("All providers failed to generate stream.");
        }
      } catch (err: any) {
        self.postMessage({ 
            type: 'ERROR', 
            payload: { 
                message: err.message, 
                status: err.status || err.statusCode || (err.response && err.response.status) 
            }, 
            id 
        });
      }
      break;

    case 'GENERATE_CONTENT':
        try {
            const providersToTry = ['gemini'].filter(p => keys[p]);
            
            if (providersToTry.length === 0) {
                throw new Error(`Gemini API Key is missing, invalid, or exhausted. Please check your API key in Settings (Gear Icon -> AI Models).`);
            }
            
            let lastError: any = null;
            let success = false;
            let resultText = "";
            let groundingMetadata = null;

            for (const currentProvider of providersToTry) {
                if (success) break;

                const currentApiKey = keys[currentProvider];
                if (!currentApiKey) {
                    if (!lastError) lastError = new Error(`API Key for ${currentProvider} is missing.`);
                    continue;
                }

                const ai = getAiInstance(currentApiKey);
                let modelName = payload.model || 'gemini-2.0-flash';
                
                let contextStr = fallbackContextString;
                if (sharedContextView && sharedContextBuffer) {
                    const decoder = new TextDecoder();
                    let end = 0;
                    while (end < sharedContextView.length && sharedContextView[end] !== 0) end++;
                    contextStr = decoder.decode(sharedContextView.subarray(0, end));
                }
                contextStr = ContextOptimizer.optimize(contextStr);
                
                let currentContents = JSON.parse(JSON.stringify(payload.contents));
                
                if (contextStr) {
                    const contextPrompt = `\n\n[SHARED PROJECT CONTEXT]\n${contextStr}\n[/SHARED PROJECT CONTEXT]`;
                    if (typeof currentContents === 'string') {
                        currentContents += contextPrompt;
                    } else if (Array.isArray(currentContents) && currentContents.length > 0) {
                        const lastMsg = currentContents[currentContents.length - 1];
                        if (lastMsg.role === 'user') {
                            if (Array.isArray(lastMsg.parts)) {
                                lastMsg.parts.push({ text: contextPrompt });
                            } else if (typeof lastMsg.parts === 'string') {
                                lastMsg.parts += contextPrompt;
                            }
                        }
                    }
                }

                let retryCount = 0;
                const maxRetries = 2;

                while (retryCount <= maxRetries && !success) {
                    try {
                        let functionCalls: any[] | undefined;
                        const response = await ai.models.generateContent({
                            model: modelName,
                            contents: currentContents,
                            config: {
                                ...(payload.config || {}),
                                safetySettings: payload.safetySettings,
                                tools: payload.tools,
                                toolConfig: payload.toolConfig
                            }
                        });
                        resultText = response.text || "";
                        groundingMetadata = response.candidates?.[0]?.groundingMetadata;
                        // @ts-ignore
                        functionCalls = response.functionCalls;

                        // Validate the full response
                        const cnc = new CNC(""); 
                        const validation = cnc.processChunk(resultText);
                        
                        if (!validation.valid) {
                            retryCount++;
                            if (retryCount <= maxRetries) {
                                const truncatedError = validation.error && validation.error.length > 500 ? validation.error.substring(0, 500) + "..." : validation.error;
                                const errorPrompt = `\n\n[SYSTEM: PREVIOUS GENERATION FAILED]\nYour previous code failed validation with error: ${truncatedError}. Please fix this error and generate the code again.`;
                                if (typeof currentContents === 'string') {
                                    currentContents += errorPrompt;
                                } else if (Array.isArray(currentContents)) {
                                    currentContents.push({ role: 'user', parts: [{ text: errorPrompt }] });
                                }
                            } else {
                                lastError = new Error(`Failed after ${maxRetries} retries. Last error: ${validation.error}`);
                                break; // Try next provider
                            }
                        } else {
                            // Final LSP Validation
                            const isCodeFile = resultText.includes('// FILE:') || resultText.includes('<code path=');

                            if (isCodeFile) {
                                const lspValidationPromise = new Promise<{valid: boolean, error?: string}>((resolve) => {
                                    const listener = (e: MessageEvent) => {
                                        if (e.data.type === 'LSP_VALIDATE_RESPONSE' && e.data.id === id) {
                                            self.removeEventListener('message', listener);
                                            resolve(e.data.payload);
                                        }
                                    };
                                    self.addEventListener('message', listener);
                                    self.postMessage({ type: 'LSP_VALIDATE_REQUEST', payload: resultText, id });
                                });
                                
                                const lspResult = await lspValidationPromise;
                                if (!lspResult.valid) {
                                    retryCount++;
                                    if (retryCount <= maxRetries) {
                                        const truncatedLspError = lspResult.error && lspResult.error.length > 500 ? lspResult.error.substring(0, 500) + "..." : lspResult.error;
                                        const errorPrompt = `\n\n[SYSTEM: PREVIOUS GENERATION FAILED]\nYour previous code failed LSP validation with error: ${truncatedLspError}. Please fix this error and generate the code again. Ensure all variables and types are properly defined or imported.`;
                                        if (typeof currentContents === 'string') {
                                            currentContents += errorPrompt;
                                        } else if (Array.isArray(currentContents)) {
                                            currentContents.push({ role: 'user', parts: [{ text: errorPrompt }] });
                                        }
                                        continue;
                                    } else {
                                        lastError = new Error(`Failed after ${maxRetries} retries. Last error: ${lspResult.error}`);
                                        break; // Try next provider
                                    }
                                }
                            }

                            success = true;
                            self.postMessage({ 
                                type: 'RESULT', 
                                payload: resultText, 
                                groundingMetadata,
                                functionCalls,
                                id 
                            });
                        }
                    } catch (err: any) {
                        lastError = err;
                        console.error(`[AI Worker] Provider ${currentProvider} failed:`, err);
                        break; // Try next provider
                    }
                }
            }

            if (!success) {
                throw lastError || new Error("All providers failed to generate content.");
            }
        } catch (err: any) {
            self.postMessage({ 
                type: 'ERROR', 
                payload: { 
                    message: err.message, 
                    status: err.status || err.statusCode || (err.response && err.response.status) 
                }, 
                id 
            });
        }
        break;

    case 'UPDATE_SHARED_BUFFER_REF':
        if (payload.sharedBuffer) {
            sharedContextBuffer = payload.sharedBuffer;
            sharedContextView = new Uint8Array(sharedContextBuffer!);
            self.postMessage({ type: 'BUFFER_REF_UPDATED', id });
        }
        break;

    case 'UPDATE_CONTEXT_STRING':
        if (payload.contextString) {
            fallbackContextString = payload.contextString;
            self.postMessage({ type: 'CONTEXT_UPDATED', id });
        }
        break;

    case 'PATCH_CONTEXT_STRING':
        if (payload.path && payload.content !== undefined) {
            const fileHeader = `--- FILE: ${payload.path} ---\n`;
            const fileRegex = new RegExp(`--- FILE: ${payload.path} ---\\n[\\s\\S]*?(?=\\n--- FILE: |$)`);
            if (fallbackContextString.match(fileRegex)) {
                if (payload.content === null) {
                    fallbackContextString = fallbackContextString.replace(fileRegex, '');
                } else {
                    fallbackContextString = fallbackContextString.replace(fileRegex, `${fileHeader}${payload.content}\n`);
                }
            } else if (payload.content !== null) {
                fallbackContextString += `\n${fileHeader}${payload.content}\n`;
            }
            self.postMessage({ type: 'CONTEXT_UPDATED', id });
        }
        break;

    case 'EMBED_CONTENT':
        try {
            const ai = getAiInstance(keys.gemini);
            const result = await ai.models.embedContent({
                model: payload.model || 'gemini-embedding-2-preview',
                contents: payload.contents,
                config: payload.config
            });
            self.postMessage({ type: 'RESULT', payload: result, id });
        } catch (err: any) {
            self.postMessage({ 
                type: 'ERROR', 
                payload: { message: err.message, status: err.status }, 
                id 
            });
        }
        break;

    case 'SHARED_CONTEXT_UPDATED':
        self.postMessage({ type: 'CONTEXT_UPDATED', id });
        break;

    default:
      self.postMessage({ type: `${type}_RESULT`, result: payload, id });
  }
};
