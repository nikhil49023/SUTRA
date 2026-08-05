import type { UserSession, UserRole } from '../types';

export class AuthService {
  private static activeSession: UserSession | null = {
    userId: 'user-001',
    username: 'Commander_Sutra',
    callsign: 'ALPHA_COMMAND',
    role: 'ADMIN',
    token: 'jwt-header.payload.signature',
    expiresAt: new Date(Date.now() + 86400000).toISOString()
  };

  public static getSession(): UserSession | null {
    return this.activeSession;
  }

  public getActiveSession(): UserSession | null {
    return AuthService.getSession();
  }

  public static login(username: string, role: UserRole = 'OPERATOR'): UserSession {
    this.activeSession = {
      userId: `user-${Date.now()}`,
      username,
      callsign: username,
      role,
      token: `jwt-${Date.now()}`,
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };
    return this.activeSession;
  }

  public static logout(): void {
    this.activeSession = null;
  }
}
