/**
 * Smart Horizon GCS — Production Frontend Authentication Store
 * Subsystem: Security & Governance (Phase 13)
 */

import { create } from 'zustand';

export interface UserProfile {
  user_id: string;
  username: string;
  display_name: string;
  role: string;
  permissions: string[];
  status: string;
  created_at: number;
}

export type SessionState = 'ACTIVE' | 'EXPIRED' | 'AUTHENTICATING' | 'LOGGED_OUT' | 'UNAUTHENTICATED';

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  role: string;
  permissions: string[];
  token: string | null;
  sessionId: string | null;
  sessionExpiresAt: number | null;
  sessionStatus: SessionState;
  lastAuthError: string | null;

  setAuthenticated: (user: UserProfile, token: string, sessionId: string, expiresAt?: number) => void;
  setSessionStatus: (status: SessionState) => void;
  setError: (err: string | null) => void;
  logout: () => void;
}

const SAVED_TOKEN_KEY = 'smart_horizon_auth_token';

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: true, // Defaults to development operator mode until explicitly set
  user: {
    user_id: 'usr_commander',
    username: 'commander',
    display_name: 'Col. Siva (Swarm Commander)',
    role: 'COMMANDER',
    permissions: [
      'telemetry.read',
      'fleet.read',
      'mission.read',
      'mission.create',
      'mission.edit',
      'mission.validate',
      'mission.execute',
      'mission.abort',
      'drone.arm',
      'drone.disarm',
      'drone.takeoff',
      'drone.land',
      'drone.rtl',
      'drone.mode_change',
      'formation.read',
      'formation.change',
      'geofence.read',
      'geofence.create',
      'geofence.edit',
      'geofence.delete',
      'gis.read',
      'gis.analyze',
      'ai.read',
      'ai.command',
      'communication.read',
      'communication.configure',
      'security.audit',
    ],
    status: 'ACTIVE',
    created_at: Date.now(),
  },
  role: 'COMMANDER',
  permissions: [],
  token: localStorage.getItem(SAVED_TOKEN_KEY),
  sessionId: null,
  sessionExpiresAt: null,
  sessionStatus: 'ACTIVE',
  lastAuthError: null,

  setAuthenticated: (user, token, sessionId, expiresAt) => {
    localStorage.setItem(SAVED_TOKEN_KEY, token);
    set({
      isAuthenticated: true,
      user,
      role: user.role,
      permissions: user.permissions,
      token,
      sessionId,
      sessionExpiresAt: expiresAt || Date.now() + 3600000,
      sessionStatus: 'ACTIVE',
      lastAuthError: null,
    });
  },

  setSessionStatus: (sessionStatus) => set({ sessionStatus }),
  setError: (lastAuthError) => set({ lastAuthError }),

  logout: () => {
    localStorage.removeItem(SAVED_TOKEN_KEY);
    set({
      isAuthenticated: false,
      user: null,
      role: 'VIEWER',
      permissions: ['telemetry.read', 'fleet.read', 'mission.read'],
      token: null,
      sessionId: null,
      sessionExpiresAt: null,
      sessionStatus: 'LOGGED_OUT',
      lastAuthError: null,
    });
  },
}));
