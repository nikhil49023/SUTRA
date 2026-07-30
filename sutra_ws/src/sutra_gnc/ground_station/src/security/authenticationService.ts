import type { UserSession, TeamMember } from './types';
import { AuditLogger } from './auditLogger';

export class AuthenticationService {
  private activeSession: UserSession | null = null;
  private teamMembers: TeamMember[] = [
    { userId: 'USR-01', name: 'Capt. Vance', callsign: 'VANCE-01', role: 'COMMANDER', clearanceLevel: 4, assignedDrones: ['SH-HEX-01', 'SH-HEX-02', 'SH-VTOL-01'] },
    { userId: 'USR-02', name: 'Lt. Miller', callsign: 'MILLER-02', role: 'OPERATOR', clearanceLevel: 3, assignedDrones: ['SH-HEX-01'] },
    { userId: 'USR-03', name: 'Sgt. Chen', callsign: 'CHEN-03', role: 'ANALYST', clearanceLevel: 2, assignedDrones: [] }
  ];

  constructor() {
    // Default active session for Capt. Vance
    this.activeSession = {
      userId: 'USR-01',
      callsign: 'VANCE-01',
      role: 'COMMANDER',
      clearanceLevel: 4,
      token: 'jwt.mock.bearer.token.vance.01',
      loginTime: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    };
  }

  public async login(callsign: string, passwordHash: string): Promise<UserSession | null> {
    const member = this.teamMembers.find((m) => m.callsign.toLowerCase() === callsign.toLowerCase());
    if (!member) {
      AuditLogger.logEvent('UNKNOWN', callsign, 'LOGIN_ATTEMPT', 'AUTH_SYSTEM', 'FAILURE');
      return null;
    }

    const session: UserSession = {
      userId: member.userId,
      callsign: member.callsign,
      role: member.role,
      clearanceLevel: member.clearanceLevel,
      token: `jwt.bearer.${member.userId}.${Date.now()}`,
      loginTime: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    };

    this.activeSession = session;
    AuditLogger.logEvent(member.userId, member.callsign, 'LOGIN', 'AUTH_SYSTEM', 'SUCCESS');
    return session;
  }

  public logout(): void {
    if (this.activeSession) {
      AuditLogger.logEvent(this.activeSession.userId, this.activeSession.callsign, 'LOGOUT', 'AUTH_SYSTEM', 'SUCCESS');
      this.activeSession = null;
    }
  }

  public getActiveSession(): UserSession | null {
    return this.activeSession;
  }

  public getTeamMembers(): TeamMember[] {
    return this.teamMembers;
  }
}
