 
import { useState } from 'react';

export function useStudioModals() {
  const [modals, setModals] = useState({
    settings: false,
    templates: false,
    deployment: false,
    git: false,
    shortcuts: false,
    commandPalette: false,
    livePreview: false,
    apkBuilder: false,
    database: false,
    analytics: false,
    export: false,
    history: false,
    manualPlanning: false,
    fullAppPreview: false
  });

  const toggleModal = (modal: keyof typeof modals, value?: boolean) => {
    setModals(prev => ({
      ...prev,
      [modal]: value !== undefined ? value : !prev[modal]
    }));
  };

  const closeAllModals = () => {
    setModals(prev => {
      const closed = { ...prev };
      (Object.keys(closed) as Array<keyof typeof modals>).forEach(key => {
        closed[key] = false;
      });
      return closed;
    });
  };

  return {
    modals,
    toggleModal,
    closeAllModals
  };
}
