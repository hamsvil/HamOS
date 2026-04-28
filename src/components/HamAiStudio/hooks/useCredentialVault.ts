import { useState, useCallback, useEffect } from 'react';
import { useSocialWorkerStore } from '../../../store/socialWorkerStore';
import { CredentialVault } from '../../../services/socialWorker/CredentialVault';

export const useCredentialVault = () => {
  const [isLocked, setIsLocked] = useState(true);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);

  const unlock = useCallback(async (passphrase: string) => {
    try {
      const salt = await CredentialVault.getSalt();
      const key = await CredentialVault.deriveKey(passphrase, salt);
      setMasterKey(key);
      setIsLocked(false);
      return true;
    } catch (e) {
      console.error('Unlock failed', e);
      return false;
    }
  }, []);

  const lock = useCallback(() => {
    setMasterKey(null);
    setIsLocked(true);
  }, []);

  const [credentials, setCredentials] = useState<any[]>([]);

  const loadCredentials = useCallback(async () => {
    if (!masterKey) return;
    const creds = await CredentialVault.getCredentials();
    const decrypted = await Promise.all(creds.map(async (c) => {
      try {
        const data = await CredentialVault.decrypt(c.encryptedData, c.iv, masterKey);
        return { ...c, data };
      } catch (e) {
        return { ...c, error: 'decryption_failed' };
      }
    }));
    setCredentials(decrypted);
  }, [masterKey]);

  useEffect(() => {
    if (!isLocked) {
      loadCredentials();
    }
  }, [isLocked, loadCredentials]);

  const saveCredential = useCallback(async (params: { id?: string, platform: string, data: any, type: 'key' | 'oauth' }) => {
    if (!masterKey) throw new Error('vault_locked');
    const { encrypted, iv } = await CredentialVault.encrypt(params.data, masterKey);
    const id = params.id || `${params.platform}_${Date.now()}`;
    await CredentialVault.saveCredential({
      id,
      platform: params.platform,
      encryptedData: encrypted,
      iv,
      lastValidated: new Date().toISOString(),
      type: params.type
    });
    await loadCredentials();
  }, [masterKey, loadCredentials]);

  const deleteCredential = useCallback(async (id: string) => {
    await CredentialVault.deleteCredential(id);
    await loadCredentials();
  }, [loadCredentials]);

  return { isLocked, unlock, lock, saveCredential, deleteCredential, credentials, masterKey };
};
