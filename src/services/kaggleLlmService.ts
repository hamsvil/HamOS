/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-catch */
/* eslint-disable no-useless-escape */
import { safeStorage } from '../utils/storage';

export interface KaggleLlmConfig {
  endpoint: string;
  apiKey?: string;
  modelName?: string;
}

class KaggleLlmService {
  private config: KaggleLlmConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  public loadConfig() {
    const endpoint = safeStorage.getItem('kaggle_llm_endpoint');
    const apiKey = safeStorage.getItem('kaggle_llm_api_key');
    const modelName = safeStorage.getItem('kaggle_llm_model') || 'kaggle-model';
    
    if (endpoint) {
      this.config = { endpoint, apiKey, modelName };
    }
  }

  public saveConfig(config: KaggleLlmConfig) {
    safeStorage.setItem('kaggle_llm_endpoint', config.endpoint);
    if (config.apiKey) safeStorage.setItem('kaggle_llm_api_key', config.apiKey);
    safeStorage.setItem('kaggle_llm_model', config.modelName || 'kaggle-model');
    this.config = config;
  }

  public isConfigured(): boolean {
    this.loadConfig();
    return !!this.config?.endpoint;
  }

  public async checkKernelStatus(username: string, apiKey: string, slug: string): Promise<string> {
    const authHeader = 'Basic ' + btoa(`${username}:${apiKey}`);
    try {
      const response = await fetch(`https://www.kaggle.com/api/v1/kernels/status?kernel=${username}/${slug}`, {
        headers: { 'Authorization': authHeader }
      });
      if (!response.ok) {
        if (response.status === 404) return 'not_found';
        throw new Error(`Failed to get status: ${response.statusText}`);
      }
      const data = await response.json();
      return data.status; // usually 'running', 'queued', 'error', 'complete', 'cancelAcknowledge'
    } catch (e) {
      console.error("Kaggle status error:", e);
      return 'error';
    }
  }

  public async stopKernel(username: string, apiKey: string, slug: string): Promise<void> {
    const authHeader = 'Basic ' + btoa(`${username}:${apiKey}`);
    // The Kaggle API to cancel a kernel is POST /api/v1/kernels/cancel?kernel=username/slug
    // Wait, the documentation says: POST /api/v1/kernels/cancel/{username}/{kernel-slug}
    // Let's try both or just the standard one. Actually, Kaggle CLI uses: /api/v1/kernels/cancel
    // Let's use the URL path format.
    const response = await fetch(`https://www.kaggle.com/api/v1/kernels/cancel/${username}/${slug}`, {
      method: 'POST',
      headers: { 'Authorization': authHeader }
    });
    if (!response.ok) {
      // Fallback to query param if path fails
      const fallbackResponse = await fetch(`https://www.kaggle.com/api/v1/kernels/cancel?kernel=${username}/${slug}`, {
        method: 'POST',
        headers: { 'Authorization': authHeader }
      });
      if (!fallbackResponse.ok) {
        throw new Error(`Failed to stop kernel: ${fallbackResponse.statusText}`);
      }
    }
  }

  public async startKernel(username: string, apiKey: string, slug: string): Promise<void> {
    const authHeader = 'Basic ' + btoa(`${username}:${apiKey}`);
    if (!this.config) this.loadConfig();
    const modelToPull = this.config?.modelName || 'gemma:2b';
    
    const scriptContent = `
import os
import time
import subprocess
import re

print("Installing dependencies...")
os.system("curl -fsSL https://ollama.com/install.sh | sh")
os.system("wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb")
os.system("dpkg -i cloudflared-linux-amd64.deb")

print("Starting Ollama server...")
subprocess.Popen(["ollama", "serve"])
time.sleep(5)

MODEL_NAME = "${modelToPull}"
print(f"Pulling model {MODEL_NAME}...")
os.system(f"ollama pull {MODEL_NAME}")

print("Starting Cloudflare Tunnel...")
tunnel_process = subprocess.Popen(
    ["cloudflared", "tunnel", "--url", "http://127.0.0.1:11434"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True
)

for line in tunnel_process.stdout:
    print(line, end='')
    match = re.search(r"https://[a-zA-Z0-9-]+\\.trycloudflare\\.com", line)
    if match:
        print(f"\\nHAM_AI_STUDIO_ENDPOINT={match.group(0)}")
        break

print("Server is running. Waiting for requests...")
while True:
    time.sleep(60)
`;

    const metadata = {
      id: `${username}/${slug}`,
      title: "Ham AI Studio LLM Server",
      code_file: "script.py",
      language: "python",
      kernel_type: "script",
      is_private: "true",
      enable_gpu: "true",
      enable_internet: "true",
      dataset_sources: [],
      competition_sources: [],
      kernel_sources: []
    };

    const formData = new FormData();
    // Create blobs for the files
    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const scriptBlob = new Blob([scriptContent], { type: 'text/plain' });
    
    formData.append('kernel-metadata.json', metadataBlob, 'kernel-metadata.json');
    formData.append('script.py', scriptBlob, 'script.py');

    const response = await fetch('https://www.kaggle.com/api/v1/kernels/push', {
      method: 'POST',
      headers: { 
        'Authorization': authHeader,
        // Do NOT set Content-Type here, let the browser set it with the boundary for FormData
      },
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to start kernel: ${response.statusText} - ${errText}`);
    }
  }

  public pollForEndpoint(username: string, apiKey: string, slug: string, onEndpointFound: (url: string) => void) {
    const authHeader = 'Basic ' + btoa(`${username}:${apiKey}`);
    let attempts = 0;
    const maxAttempts = 60; // 60 * 10s = 10 minutes

    const poll = async () => {
      if (attempts >= maxAttempts) {
        console.error("Timeout waiting for Kaggle endpoint.");
        return;
      }
      attempts++;

      try {
        // First check if it's running
        const statusResponse = await fetch(`https://www.kaggle.com/api/v1/kernels/status?kernel=${username}/${slug}`, {
          headers: { 'Authorization': authHeader }
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.status === 'error' || statusData.status === 'canceled') {
            console.error("Kernel stopped or errored.");
            return;
          }
        }

        // Get output log
        const logResponse = await fetch(`https://www.kaggle.com/api/v1/kernels/output/${username}/${slug}`, {
          headers: { 'Authorization': authHeader }
        });
        
        if (logResponse.ok) {
          const logData = await logResponse.json();
          const logText = logData.log || '';
          
          // Search for our specific marker
          const match = logText.match(/HAM_AI_STUDIO_ENDPOINT=(https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com)/);
          if (match && match[1]) {
            onEndpointFound(match[1]);
            return; // Stop polling
          }
        }
      } catch (e) {
        console.error("Error polling Kaggle log:", e);
      }

      // Wait 10 seconds and try again
      setTimeout(poll, 10000);
    };

    // Start polling after 30 seconds to give it time to boot
    setTimeout(poll, 30000);
  }

  public async generate(
    prompt: string,
    systemInstruction: string,
    history: { role: string; content: string }[],
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    if (!this.config) this.loadConfig();
    if (!this.config?.endpoint) throw new Error("Kaggle LLM Endpoint not configured");

    // Ensure SUPREME PROTOCOL is included
    let finalSystemInstruction = systemInstruction;
    if (!finalSystemInstruction.includes("SUPREME PROTOCOL")) {
        finalSystemInstruction += "\n\n[SYSTEM REMINDER: SUPREME PROTOCOL v21.0 & HAM ENGINE APEX V5.0 ACTIVE. ZERO-GUESSWORK. ANTI-PANGKAS. SELF-HEALING. NO PLACEHOLDERS. COMPLETE FIXES ONLY. READ STRUKTUR.]";
    }

    const messages = [
      { role: 'system', content: finalSystemInstruction },
      ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : h.role, content: h.content })),
      { role: 'user', content: prompt }
    ];

    try {
      const response = await fetch(`${this.config.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey || 'kaggle-token'}` // Some endpoints require a dummy token
        },
        body: JSON.stringify({
          model: this.config.modelName,
          messages: messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 4096 // Adjust based on model capability
        }),
        signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Kaggle LLM Error (${response.status}): ${errorText}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        if (signal?.aborted) {
            reader.cancel();
            throw new Error('cancelled');
        }
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.trim() === 'data: [DONE]') continue;
            
            if (line.startsWith('data: ')) {
                try {
                    const json = JSON.parse(line.substring(6));
                    const content = json.choices?.[0]?.delta?.content || '';
                    if (content) {
                        fullText += content;
                        onChunk(fullText);
                    }
                } catch (e) {
                    // Error parsing chunk
                }
            }
        }
      }
      
      return fullText;

    } catch (e) {
      throw e;
    }
  }
}

export const kaggleLlmService = new KaggleLlmService();
