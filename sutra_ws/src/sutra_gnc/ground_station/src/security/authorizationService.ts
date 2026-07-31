import type { UserSession } from './types';
import { RBACEngine, SecurityPermission } from './rbacEngine';
import { AuditLogger } from './auditLogger';

export class AuthorizationService {
  /**
   * Authorizes execution of a MAVLink command based on active user session clearance
   */
  static authorizeCommand(session: UserSession | null, commandName: string): boolean {
    if (!session) {
      AuditLogger.logEvent('ANONYMOUS', 'UNAUTH', `EXECUTE_${commandName}`, 'DRONE_COMMAND', 'DENIED');
      return false;
    }

    const isAuthorized = RBACEngine.hasPermission(session.role, 'EXECUTE_COMMANDS');
    AuditLogger.logEvent(
      session.userId,
      session.callsign,
      `EXECUTE_${commandName}`,
      'DRONE_COMMAND',
      isAuthorized ? 'GRANTED' : 'DENIED'
    );

    return isAuthorized;
  }

  /**
   * Authorizes editing flight plan waypoints
   */
  static authorizeWaypointEdit(session: UserSession | null): boolean {
    if (!session) return false;
    return RBACEngine.hasPermission(session.role, 'EDIT_WAYPOINTS');
  }
}
