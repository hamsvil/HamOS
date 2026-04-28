/* eslint-disable no-useless-assignment */
import { get, set } from 'idb-keyval';

const KEY_ID = 'ham-master-key';

// Get or create a CryptoKey
const getMasterKey = async (): Promise<CryptoKey> => {
  let key = await get<CryptoKey>(KEY_ID);

  if (!key) {
    key = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      false, // non-extractable
      ['encrypt', 'decrypt']
    );
    await set(KEY_ID, key);
  }
  return key;
};

export const encryptData = async (data: string): Promise<string> => {
  try {
    const key = await getMasterKey();
    const encodedData = new TextEncoder().encode(data);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encodedData
    );

    // Combine IV and encrypted data
    const buffer = new Uint8Array(iv.byteLength + encryptedContent.byteLength);
    buffer.set(iv, 0);
    buffer.set(new Uint8Array(encryptedContent), iv.byteLength);

    // Convert to base64
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  } catch (e) {
    console.error('Encryption failed:', e);
    throw new Error('Failed to encrypt data', { cause: e });
  }
};

export const decryptData = async (encryptedBase64: string): Promise<string> => {
  try {
    const key = await getMasterKey();
    const binary = atob(encryptedBase64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }

    const iv = buffer.slice(0, 12);
    const data = buffer.slice(12);

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (e) {
    console.error('Decryption failed:', e);
    throw new Error('Failed to decrypt data', { cause: e });
  }
};
