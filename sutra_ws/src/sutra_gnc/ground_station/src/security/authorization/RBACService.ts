import type { UserRole, UserSession } from '../types';
import { AuthService } from '../authentication/AuthService';

export type SecurityPermission = string;

export class RBACService {
  private static rolePermissions: Record<UserRole, string[]> = {
    ADMIN: ['*'],
    COMMANDER: ['*'],
    OPERATOR: ['MISSION_UPLOAD', 'ARM_DRONE', 'TAKEOFF', 'RTL', 'GEOFENCE_EDIT'],
    PILOT: ['ARM_DRONE', 'TAKEOFF', 'MANUAL_FLIGHT'],
    VIEWER: ['VIEW_TELEMETRY', 'VIEW_MAP']
  };

  public static isAuthorized(permission: string): boolean {
    const session = AuthService.getSession();
    if (!session) return false;
    const perms = this.rolePermissions[session.role] || [];
    return perms.includes('*') || perms.includes(permission);
  }

  public static authorizeCommand(session: UserSession | null, commandName: string): boolean {
    if (!session) return false;
    return true;
  }

  public static hasPermission(role: UserRole, permission: string): boolean {
    const perms = this.rolePermissions[role] || [];
    return perms.includes('*') || perms.includes(permission);
  }
}
