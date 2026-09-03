import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../security/authStore';
import { checkPermission } from '../security/permissionStore';
import { messageRouter } from '../communication/MessageRouter';

describe('SMART HORIZON GCS — Frontend Security & Permission Store Tests', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('TEST 1: Auth store records authenticated user and session', () => {
    const mockUser = {
      user_id: 'usr_pilot_01',
      username: 'pilot',
      display_name: 'Capt. Alpha (Flight Pilot)',
      role: 'PILOT',
      permissions: ['telemetry.read', 'drone.arm', 'drone.takeoff', 'drone.rtl'],
      status: 'ACTIVE',
      created_at: Date.now(),
    };

    useAuthStore.getState().setAuthenticated(mockUser, 'token_xyz123', 'sess_abc456', Date.now() + 3600000);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.username).toBe('pilot');
    expect(state.role).toBe('PILOT');
    expect(state.token).toBe('token_xyz123');
    expect(state.sessionId).toBe('sess_abc456');
    expect(state.sessionStatus).toBe('ACTIVE');
  });

  it('TEST 2: Role-based permission evaluation', () => {
    // Viewer permissions
    const viewerPerms = ['telemetry.read', 'fleet.read', 'mission.read'];
    expect(checkPermission(viewerPerms, 'VIEWER', 'telemetry.read')).toBe(true);
    expect(checkPermission(viewerPerms, 'VIEWER', 'drone.arm')).toBe(false);
    expect(checkPermission(viewerPerms, 'VIEWER', 'mission.execute')).toBe(false);

    // Pilot permissions
    const pilotPerms = ['telemetry.read', 'drone.arm', 'drone.takeoff', 'drone.rtl'];
    expect(checkPermission(pilotPerms, 'PILOT', 'drone.arm')).toBe(true);
    expect(checkPermission(pilotPerms, 'PILOT', 'drone.takeoff')).toBe(true);

    // Commander role has universal operational override
    expect(checkPermission([], 'COMMANDER', 'drone.rtl')).toBe(true);
    expect(checkPermission([], 'COMMANDER', 'mission.abort')).toBe(true);

    // Admin role has universal system override
    expect(checkPermission([], 'ADMIN', 'system.configure')).toBe(true);
  });

  it('TEST 3: MessageRouter handles AUTH_RESPONSE envelopes', () => {
    const authSuccessEnvelope = {
      type: 'AUTH_RESPONSE',
      status: 'SUCCESS',
      user: {
        user_id: 'usr_planner_01',
        username: 'planner',
        display_name: 'Maj. Sarah (Mission Planner)',
        role: 'MISSION_PLANNER',
        permissions: ['mission.create', 'mission.edit', 'mission.validate'],
        status: 'ACTIVE',
        created_at: Date.now(),
      },
      token: 'jwt_planner_token',
      session_id: 'sess_planner_789',
      expires_at: Date.now() + 7200000,
    };

    messageRouter.routeMessage(authSuccessEnvelope);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.username).toBe('planner');
    expect(state.role).toBe('MISSION_PLANNER');
    expect(state.token).toBe('jwt_planner_token');
    expect(state.sessionId).toBe('sess_planner_789');
  });
});
