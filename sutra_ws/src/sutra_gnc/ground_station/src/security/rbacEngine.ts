import type { RoleLevel } from './types';

export type SecurityPermission = 
  | 'EXECUTE_COMMANDS'
  | 'TRIGGER_RTH'
  | 'EDIT_WAYPOINTS'
  | 'VIEW_TELEMETRY'
  | 'MANAGE_USERS'
  | 'EXPORT_ANALYTICS'
  | 'MANAGE_AI';

const ROLE_PERMISSIONS: Record<RoleLevel, SecurityPermission[]> = {
  COMMANDER: ['EXECUTE_COMMANDS', 'TRIGGER_RTH', 'EDIT_WAYPOINTS', 'VIEW_TELEMETRY', 'MANAGE_USERS', 'EXPORT_ANALYTICS', 'MANAGE_AI'],
  OPERATOR: ['EXECUTE_COMMANDS', 'TRIGGER_RTH', 'EDIT_WAYPOINTS', 'VIEW_TELEMETRY', 'EXPORT_ANALYTICS', 'MANAGE_AI'],
  ANALYST: ['VIEW_TELEMETRY', 'EXPORT_ANALYTICS', 'MANAGE_AI'],
  VIEWER: ['VIEW_TELEMETRY']
};

export class RBACEngine {
  public static hasPermission(role: RoleLevel, permission: SecurityPermission): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  public static isClearanceSufficient(userClearance: number, requiredClearance: number): boolean {
    return userClearance >= requiredClearance;
  }
}
