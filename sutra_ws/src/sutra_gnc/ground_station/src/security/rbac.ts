export type UserRole = 'COMMANDER' | 'OPERATOR' | 'ANALYST' | 'VIEWER';

export type Permission = 
  | 'EXECUTE_COMMANDS'
  | 'TRIGGER_RTH'
  | 'EDIT_WAYPOINTS'
  | 'VIEW_TELEMETRY'
  | 'MANAGE_USERS'
  | 'EXPORT_ANALYTICS'
  | 'MANAGE_AI';

export interface UserSecurityContext {
  userId: string;
  callsign: string;
  role: UserRole;
  clearanceLevel: number;
}

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  COMMANDER: [
    'EXECUTE_COMMANDS',
    'TRIGGER_RTH',
    'EDIT_WAYPOINTS',
    'VIEW_TELEMETRY',
    'MANAGE_USERS',
    'EXPORT_ANALYTICS',
    'MANAGE_AI'
  ],
  OPERATOR: [
    'EXECUTE_COMMANDS',
    'TRIGGER_RTH',
    'EDIT_WAYPOINTS',
    'VIEW_TELEMETRY',
    'EXPORT_ANALYTICS',
    'MANAGE_AI'
  ],
  ANALYST: [
    'VIEW_TELEMETRY',
    'EXPORT_ANALYTICS',
    'MANAGE_AI'
  ],
  VIEWER: [
    'VIEW_TELEMETRY'
  ]
};

export class RBACService {
  static hasPermission(role: UserRole, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  static isAuthorizedForClearance(userClearance: number, requiredClearance: number): boolean {
    return userClearance >= requiredClearance;
  }
}
