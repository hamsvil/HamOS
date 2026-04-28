 
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../../context/ToastContext';
import { safeStorage } from '../../../utils/storage';

export function useFileAuth() {
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const savedToken = safeStorage.getItem('ps_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  const login = useCallback(async (pwd: string) => {
    setLoading(true);
    try {
      const res = await fetch('/ham-api/private-source/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: pwd })
      });

      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setToken(data.token);
        safeStorage.setItem('ps_token', data.token);
        showToast('Access Granted');
        return true;
      } else {
        showToast('Invalid Access Key');
        return false;
      }
    } catch (err) {
      showToast('Connection failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setToken('');
    safeStorage.removeItem('ps_token');
    showToast('Logged out');
  }, [showToast]);

  return {
    token,
    isAuthenticated,
    setIsAuthenticated,
    loading,
    login,
    logout
  };
}
