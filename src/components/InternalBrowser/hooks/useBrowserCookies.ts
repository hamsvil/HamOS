 
import { useState, useEffect, useCallback } from 'react';
import { structuredDb, BrowserCookie } from '../../../db/structuredDb';
import { useLiveQuery } from 'dexie-react-hooks';
import { nativeBridge } from '../../../utils/nativeBridge';

export function useBrowserCookies() {
  const cookies = useLiveQuery(() => structuredDb.browserCookies.toArray()) || [];

  // Sync from Native to Web on mount
  useEffect(() => {
    const syncFromNative = async () => {
      if (nativeBridge.isAvailable()) {
        try {
          const nativeCookiesStr = await nativeBridge.callAsync('Android', 'getCookies');
          if (nativeCookiesStr) {
            const nativeCookies = JSON.parse(nativeCookiesStr);
            if (Array.isArray(nativeCookies) && nativeCookies.length > 0) {
              await structuredDb.browserCookies.clear();
              await structuredDb.browserCookies.bulkAdd(nativeCookies.map(c => ({
                ...c,
                timestamp: Date.now()
              })));
            }
          }
        } catch (err) {
          console.error('Failed to sync cookies from native:', err);
        }
      }
    };
    syncFromNative();
  }, []);

  const syncToNative = useCallback(async (currentCookies: any[]) => {
    if (nativeBridge.isAvailable()) {
      try {
        await nativeBridge.callAsync('Android', 'setCookies', JSON.stringify(currentCookies));
      } catch (err) {
        console.error('Failed to sync cookies to native:', err);
      }
    }
  }, []);

  const addCookie = useCallback(async (cookie: Omit<BrowserCookie, 'id' | 'timestamp'>) => {
    await structuredDb.browserCookies.put({
      ...cookie,
      timestamp: Date.now()
    });
    const updatedCookies = await structuredDb.browserCookies.toArray();
    syncToNative(updatedCookies);
  }, [syncToNative]);

  const removeCookie = useCallback(async (id: number) => {
    await structuredDb.browserCookies.delete(id);
    const updatedCookies = await structuredDb.browserCookies.toArray();
    syncToNative(updatedCookies);
  }, [syncToNative]);

  const clearCookies = useCallback(async () => {
    await structuredDb.browserCookies.clear();
    syncToNative([]);
  }, [syncToNative]);

  const setCookies = useCallback(async (newCookies: any[]) => {
    // Bulk update
    await structuredDb.browserCookies.clear();
    const toAdd = newCookies.map(c => ({
      ...c,
      timestamp: Date.now()
    }));
    await structuredDb.browserCookies.bulkAdd(toAdd);
    syncToNative(toAdd);
  }, [syncToNative]);

  return {
    cookies,
    addCookie,
    removeCookie,
    clearCookies,
    setCookies
  };
}
