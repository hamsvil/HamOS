import { useState } from 'react';
import { CameraState } from '../../../types/hCamera';
import { HCameraService } from '../../../services/hCamera/HCameraService';

export const useHCamera = () => {
  const [state, setState] = useState<CameraState>({
    active: false,
    loading: false,
    mode: 'normal',
    error: null
  });

  const toggleActive = async () => {
    const newState = !state.active;
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    // Create AbortController for potential cleanup/race condition
    const controller = new AbortController();
    
    try {
      const success = await HCameraService.toggleSystem(newState);
      if (success) {
        setState(prev => ({ ...prev, active: newState, loading: false }));
      } else {
        throw new Error("Hardware bridge refused optics activation.");
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, error: err.message || 'System failed' }));
    }
  };

  const setMode = async (mode: CameraState['mode']) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      await HCameraService.applyFilter(mode);
      setState(prev => ({ ...prev, mode, loading: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
    }
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  return { ...state, toggleActive, setMode, setError };
};
