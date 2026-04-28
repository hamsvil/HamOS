/* eslint-disable no-useless-assignment */
import { safeStorage } from '../utils/storage';

const KMS_WORKER_URL = 'https://kms-worker.ham-ai-studio.workers.dev'; // Placeholder URL

export const kmsService = {
  async storeSecret(keyName: string, secretValue: string, userToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${KMS_WORKER_URL}/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ key: keyName, value: secretValue })
      });
      return response.ok;
    } catch (e) {
      console.error('KMS Store Error:', e);
      return false;
    }
  },

  async getSecret(keyName: string, userToken: string): Promise<string | null> {
    try {
      const response = await fetch(`${KMS_WORKER_URL}/retrieve?key=${keyName}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        return data.value;
      }
      return null;
    } catch (e) {
      console.error('KMS Retrieve Error:', e);
      return null;
    }
  },

  // Proxies a request through the KMS worker to avoid exposing the secret to the browser
  async proxyRequest(url: string, options: RequestInit, keyName: string, userToken: string): Promise<Response> {
    return fetch(`${KMS_WORKER_URL}/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        targetUrl: url,
        options,
        keyName
      })
    });
  }
};
