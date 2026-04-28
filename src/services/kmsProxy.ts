/* eslint-disable no-useless-assignment */
// Point 19: Secure Secrets Management (Cloudflare Worker KMS Proxy)
// This service routes Gemini API requests through a Cloudflare Worker
// to prevent exposing API keys in the client-side bundle.

export class KMSProxy {
  private static kmsUrl: string | null = null;

  public static init(url: string) {
    this.kmsUrl = url;
  }

  public static isEnabled(): boolean {
    return !!this.kmsUrl;
  }

  public static async generateContent(model: string, payload: any): Promise<unknown> {
    if (!this.kmsUrl) throw new Error('KMS Proxy not initialized');

    const response = await fetch(`${this.kmsUrl}/v1/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The Cloudflare worker will inject the actual Authorization/API Key header
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`KMS Proxy Error: ${response.statusText}`);
    }

    return response.json();
  }
}
