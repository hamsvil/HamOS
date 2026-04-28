/* eslint-disable no-useless-assignment */
import { create } from 'zustand';

interface SystemState {
  isRuntimeReady: boolean;
  isInstalling: boolean;
  setRuntimeReady: (ready: boolean) => void;
  setInstalling: (installing: boolean) => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  isRuntimeReady: false,
  isInstalling: false,
  setRuntimeReady: (ready) => set({ isRuntimeReady: ready }),
  setInstalling: (installing) => set({ isInstalling: installing }),
}));
