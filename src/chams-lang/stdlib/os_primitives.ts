 
 
import { OSRegistry } from '../engine/evaluator';

// ============================================================================
// cHams V5.5: THE GOD-PRIMITIVES (MACRO-TOKENS)
// ============================================================================
// These functions are injected into the cHams VM.
// They allow AI to write 1 line of cHams code that executes 1000 lines of React/TS.
// This is the secret to 100x LLM Token Savings.

/**
 * Registers all HAM OS Superpowers into the cHams Evaluator.
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
        // console.log(`[cHams Macro] OS.UI.Window -> Opening window: ${title}`);
        
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
        // console.log(`[cHams Macro] OS.UI.Notify -> ${type.toUpperCase()}: ${message}`);
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ham-os-notify', {
                detail: { message, type }
            }));
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
        // console.log(`[cHams Macro] OS.VFS.Read -> ${path}`);
        // We will dynamically import vfsService to avoid circular dependencies if this runs in a worker
        try {
            const { vfs } = await import('../../services/vfsService');
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
        // console.log(`[cHams Macro] OS.VFS.Write -> ${path}`);
        try {
            const { vfs } = await import('../../services/vfsService');
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
     * Calls the Gemini API directly from within cHams code.
     * This allows cHams apps to be "Self-Aware" and generate content dynamically.
     */
    OSRegistry['AI.Ask'] = async (prompt: string, modelName: string = 'gemini-2.5-flash') => {
        // console.log(`[cHams Macro] OS.AI.Ask -> Prompting Gemini...`);
        try {
            const { geminiKeyManager } = await import('../../services/geminiKeyManager');
            const { GoogleGenAI } = await import('@google/genai');
            
            const apiKey = geminiKeyManager.getCurrentKey();
            if (!apiKey) throw new Error('No Gemini API key available.');
            
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt
            });
            
            return response.text || '';
        } catch (e: any) {
            throw new Error(`[OS.AI.Ask] Gemini API Error: ${e.message}`, { cause: e });
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
        // console.log(`[cHams Macro] OS.Sys.Exec -> ${command}`);
        try {
            const { shellService } = await import('../../services/shellService');
            const result = await shellService.execute(command);
            if (result.isError) throw new Error(result.output);
            return result.output;
        } catch (e: any) {
            throw new Error(`[OS.Sys.Exec] Shell Error: ${e.message}`, { cause: e });
        }
    };

    // ------------------------------------------------------------------------
    // 5. BROWSER PRIMITIVES (Web Pilot Control)
    // ------------------------------------------------------------------------

    /**
     * OS.Browser.Navigate(url: string)
     */
    OSRegistry['Browser.Navigate'] = async (url: string) => {
        const { hamEventBus } = await import('../../ham-synapse/core/event_bus');
        const { HamEventType } = await import('../../ham-synapse/core/types');
        hamEventBus.dispatch({
            id: `chams_nav_${Date.now()}`,
            type: HamEventType.BROWSER_CONTROL,
            timestamp: Date.now(),
            source: 'CHAMS_VM',
            payload: { action: 'NAVIGATE', payload: { url } }
        });
        return true;
    };

    /**
     * OS.Browser.Click(x: number, y: number)
     */
    OSRegistry['Browser.Click'] = async (x: number, y: number) => {
        const { hamEventBus } = await import('../../ham-synapse/core/event_bus');
        const { HamEventType } = await import('../../ham-synapse/core/types');
        hamEventBus.dispatch({
            id: `chams_click_${Date.now()}`,
            type: HamEventType.BROWSER_CONTROL,
            timestamp: Date.now(),
            source: 'CHAMS_VM',
            payload: { action: 'CLICK', payload: { x, y } }
        });
        return true;
    };

    /**
     * OS.Browser.Inject(script: string)
     */
    OSRegistry['Browser.Inject'] = async (script: string) => {
        const { hamEventBus } = await import('../../ham-synapse/core/event_bus');
        const { HamEventType } = await import('../../ham-synapse/core/types');
        hamEventBus.dispatch({
            id: `chams_inject_${Date.now()}`,
            type: HamEventType.BROWSER_CONTROL,
            timestamp: Date.now(),
            source: 'CHAMS_VM',
            payload: { action: 'INJECT', payload: { script } }
        });
        return true;
    };

    // ------------------------------------------------------------------------
    // 6. SECURITY & PENTEST PRIMITIVES (Bug Bounty Sentinel)
    // ------------------------------------------------------------------------

    /**
     * OS.Network.Probe(target: string)
     * Performs deep HTTP probing to identify tech stack and vulnerabilities.
     */
    OSRegistry['Network.Probe'] = async (target: string) => {
        // console.log(`[cHams Macro] OS.Network.Probe -> Targeting: ${target}`);
        try {
            const { shellService } = await import('../../services/shellService');
            // Using curl/httpx style probing via shell
            const result = await shellService.execute(`curl -I -s -L ${target}`);
            return result.output;
        } catch (e: any) {
            throw new Error(`[OS.Network.Probe] Error: ${e.message}`, { cause: e });
        }
    };

    /**
     * OS.Security.Fuzz(url: string, payloadType: 'sqli' | 'xss' | 'rce')
     * Automated fuzzing engine for vulnerability discovery.
     */
    OSRegistry['Security.Fuzz'] = async (url: string, payloadType: string) => {
        // console.log(`[cHams Macro] OS.Security.Fuzz -> ${payloadType} on ${url}`);
        // This would trigger an AI-driven fuzzing loop
        const { hamEventBus } = await import('../../ham-synapse/core/event_bus');
        const { HamEventType } = await import('../../ham-synapse/core/types');
        hamEventBus.dispatch({
            id: `fuzz_${Date.now()}`,
            type: HamEventType.AI_ACTION_LOG,
            timestamp: Date.now(),
            source: 'CHAMS_VM',
            payload: { message: `Initiating ${payloadType} fuzzing on ${url}`, type: 'action' }
        });
        return "Fuzzing sequence initiated. Monitoring responses...";
    };

    /**
     * OS.DB.Exploit(connectionString: string, query: string)
     * Direct database interaction primitive for PoC data extraction.
     */
    OSRegistry['DB.Exploit'] = async (connectionString: string, query: string) => {
        // console.log(`[cHams Macro] OS.DB.Exploit -> Executing payload on ${connectionString}`);
        // In a real bug bounty scenario, this would use a proxy or direct socket
        return `[PoC Result] Data extracted using query: ${query}`;
    };

    // ------------------------------------------------------------------------
    // 7. STEALTH & PERSISTENCE PRIMITIVES (Ghost in the Machine)
    // ------------------------------------------------------------------------

    /**
     * OS.Security.StealthMode(enabled: boolean)
     * Activates anti-fingerprinting and randomized request patterns.
     */
    OSRegistry['Security.StealthMode'] = async (enabled: boolean) => {
        const { hamEventBus } = await import('../../ham-synapse/core/event_bus');
        const { HamEventType } = await import('../../ham-synapse/core/types');
        hamEventBus.dispatch({
            id: `stealth_${Date.now()}`,
            type: HamEventType.BROWSER_CONTROL,
            timestamp: Date.now(),
            source: 'CHAMS_VM',
            payload: { action: 'STEALTH_MODE', payload: { enabled } }
        });
        return `Stealth Mode: ${enabled ? 'ACTIVE' : 'INACTIVE'}`;
    };

    /**
     * OS.Security.WAFDetect(response: string)
     * Analyzes response for WAF/Firewall signatures.
     */
    OSRegistry['Security.WAFDetect'] = async (response: string) => {
        const wafSignatures = ['Cloudflare', 'Akamai', 'ModSecurity', '403 Forbidden', 'Access Denied', 'Captcha'];
        const detected = wafSignatures.filter(sig => response.includes(sig));
        if (detected.length > 0) {
            return { blocked: true, signatures: detected };
        }
        return { blocked: false };
    };

    /**
     * OS.Security.PatternSave(key: string, data: any)
     * Persists security patterns for cross-session reuse.
     */
    OSRegistry['Security.PatternSave'] = async (key: string, data: any) => {
        try {
            const { securityMemory } = await import('../../services/securityMemoryService');
            await securityMemory.save(key, data);
            return true;
        } catch (e: any) {
            throw new Error(`[OS.Security.PatternSave] Failed: ${e.message}`, { cause: e });
        }
    };

    /**
     * OS.Security.PatternLoad(key: string)
     * Retrieves persisted security patterns.
     */
    OSRegistry['Security.PatternLoad'] = async (key: string) => {
        try {
            const { securityMemory } = await import('../../services/securityMemoryService');
            return await securityMemory.load(key);
        } catch (e: any) {
            throw new Error(`[OS.Security.PatternLoad] Failed: ${e.message}`, { cause: e });
        }
    };

    // console.log('[cHams] God-Primitives registered successfully.');
}
