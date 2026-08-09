import { create } from 'zustand';
import type { DroneAsset } from '../types';
import { INITIAL_DRONES } from '../lib/mockData';

export interface GlobalStoreState {
  isLoading: boolean;
  activeDrone: DroneAsset;
  backendStatus: 'CONNECTED' | 'DISCONNECTED' | 'MOCK_FALLBACK';
  globalError: string | null;
  setIsLoading: (loading: boolean) => void;
  setActiveDrone: (drone: DroneAsset) => void;
  setBackendStatus: (status: 'CONNECTED' | 'DISCONNECTED' | 'MOCK_FALLBACK') => void;
  setGlobalError: (error: string | null) => void;
}

export const useGlobalStore = create<GlobalStoreState>((set) => ({
  isLoading: false,
  activeDrone: INITIAL_DRONES[0],
  backendStatus: 'MOCK_FALLBACK',
  globalError: null,
  setIsLoading: (loading) => set({ isLoading: loading }),
  setActiveDrone: (drone) => set({ activeDrone: drone }),
  setBackendStatus: (status) => set({ backendStatus: status }),
  setGlobalError: (error) => set({ globalError: error })
}));
