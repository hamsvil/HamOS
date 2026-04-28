 
 
import { OSRegistry } from '../engine/evaluator_core';
import { TypeValidator } from '../core/types';
import { vfs } from '../../services/vfsService';
import { geminiKeyManager } from '../../services/geminiKeyManager';
import { GoogleGenAI } from '@google/genai';
import { shellService } from '../../services/shellService';

// ============================================================================
// Ham Engine V5.5: THE GOD-PRIMITIVES (MACRO-TOKENS)
// ============================================================================
// These functions are injected into the Ham Engine VM.
// They allow AI to write 1 line of Ham Engine code that executes 1000 lines of React/TS.
// This is the secret to 100x LLM Token Savings.

/**
 * Registers all HAM OS Superpowers into the Ham Engine Evaluator.
 * Must be called once during system initialization.
 */
export function registerGodPrimitives() {
    
    // ------------------------------------------------------------------------
    // 1. UI PRIMITIVES (Holographic Rendering)
    // ------------------------------------------------------------------------
    
    /**
     * OS.UI.Window(title: string, contentId: string)
     * Instructs HAM OS to open a new Draggable Window containing the specified UI component.
     */
    OSRegistry['UI.Window'] = async (title: string, contentId: string) => {
        TypeValidator.validate('UI.Window', [title, contentId], ['string', 'string']);
        console.log(`[Ham Engine Macro] OS.UI.Window -> Opening window: ${title}`);
        
        // In a full implementation, this dispatches an event to the React WindowManager
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ham-os-open-window', {
                detail: { title, contentId }
            }));
        }
        return `Window_${Date.now()}`; // Returns Window ID
    };

    /**
     * OS.UI.Notify(message: string, type: 'info' | 'success' | 'error')
     * Triggers a toast notification in HAM OS.
     */
    OSRegistry['UI.Notify'] = async (message: string, type: string = 'info') => {
        console.log(`[Ham Engine Macro] OS.UI.Notify -> ${type.toUpperCase()}: ${message}`);
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ham-os-notify', {
                detail: { message, type }
            }));
        }
        return true;
    };

    /**
     * OS.UI.Text(text: string, style?: any)
     * Renders text in the UI.
     */
    OSRegistry['UI.Text'] = async (text: string, style?: any) => {
        console.log(`[Ham Engine Macro] OS.UI.Text -> Rendering text: ${text}`);
        return { type: 'text', content: text, style };
    };

    /**
     * OS.UI.Button(label: string, onClick: Function)
     * Renders a button in the UI.
     */
    OSRegistry['UI.Button'] = async (label: string, onClick: Function) => {
        console.log(`[Ham Engine Macro] OS.UI.Button -> Rendering button: ${label}`);
        return { type: 'button', label, onClick };
    };

    /**
     * OS.UI.Listen(eventName: string, callback: Function)
     * Two-Way UI Bridge: Listens for events from the React UI and executes a Ham Engine function.
     */
    OSRegistry['UI.Listen'] = async (eventName: string, callback: Function) => {
        TypeValidator.validate('UI.Listen', [eventName, callback], ['string', 'function']);
        console.log(`[Ham Engine Macro] OS.UI.Listen -> Listening for: ${eventName}`);
        
        if (typeof window !== 'undefined') {
            window.addEventListener(eventName, async (e: any) => {
                try {
                    // Execute the Ham Engine callback with the event details
                    await callback(e.detail || {});
                } catch (err: any) {
                    console.error(`[Ham Engine UI Bridge Error] Failed to execute callback for ${eventName}:`, err.message);
                }
            });
        }
        return true;
    };

    // ------------------------------------------------------------------------
    // 2. VFS PRIMITIVES (Titanium Vault Access)
    // ------------------------------------------------------------------------

    /**
     * OS.VFS.Read(path: string)
     * Reads a file from the Virtual File System.
     */
    OSRegistry['VFS.Read'] = async (path: string) => {
        console.log(`[Ham Engine Macro] OS.VFS.Read -> ${path}`);
        try {
            return await vfs.readFile(path);
        } catch (e: any) {
            throw new Error(`[OS.VFS.Read] Failed to read ${path}: ${e.message}`, { cause: e });
        }
    };

    /**
     * OS.VFS.Write(path: string, content: string)
     * Writes data to the Virtual File System.
     */
    OSRegistry['VFS.Write'] = async (path: string, content: string) => {
        console.log(`[Ham Engine Macro] OS.VFS.Write -> ${path}`);
        try {
            await vfs.writeFile(path, content);
            return true;
        } catch (e: any) {
            throw new Error(`[OS.VFS.Write] Failed to write ${path}: ${e.message}`, { cause: e });
        }
    };

    // ------------------------------------------------------------------------
    // 3. AI PRIMITIVES (Singularity Symbiosis)
    // ------------------------------------------------------------------------

    /**
     * OS.AI.Ask(prompt: string, model?: string)
     * Calls the Ham Engine API directly from within Ham Engine code.
     * This allows Ham Engine apps to be "Self-Aware" and generate content dynamically.
     */
    OSRegistry['AI.Ask'] = async (prompt: string, modelName: string = 'gemini-2.5-flash') => {
        console.log(`[Ham Engine Macro] OS.AI.Ask -> Prompting Ham Engine...`);
        try {
            const response = await geminiKeyManager.executeWithRetry(
                async (client) => {
                    const result = await client.models.generateContent({
                        model: modelName,
                        contents: [{ role: 'user', parts: [{ text: prompt }] }]
                    });
                    return { text: result.text };
                },
                30000 // 30s timeout
            );
            
            return response.text || '';
        } catch (e: any) {
            throw new Error(`[OS.AI.Ask] Ham Engine API Error: ${e.message}`, { cause: e });
        }
    };

    // ------------------------------------------------------------------------
    // 4. SYSTEM PRIMITIVES (Core OS Functions)
    // ------------------------------------------------------------------------

    /**
     * OS.Sys.Delay(ms: number)
     * Pauses execution for X milliseconds without freezing the UI (Non-blocking).
     */
    OSRegistry['Sys.Delay'] = async (ms: number) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    };

    /**
     * OS.Sys.Time()
     * Returns current timestamp.
     */
    OSRegistry['Sys.Time'] = async () => {
        return Date.now();
    };
    
    /**
     * OS.Sys.Exec(command: string)
     * Executes a shell command in the WebContainer (if available).
     */
    OSRegistry['Sys.Exec'] = async (command: string) => {
        console.log(`[Ham Engine Macro] OS.Sys.Exec -> ${command}`);
        try {
            const result = await shellService.execute(command);
            if (result.isError) throw new Error(result.output);
            return result.output;
        } catch (e: any) {
            throw new Error(`[OS.Sys.Exec] Shell Error: ${e.message}`, { cause: e });
        }
    };

    console.log('[Ham Engine] God-Primitives registered successfully.');
}
