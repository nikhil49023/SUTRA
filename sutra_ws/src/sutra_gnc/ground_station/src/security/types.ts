export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER' | 'PILOT' | 'COMMANDER';
export type RoleLevel = UserRole;

export interface UserSession {
  userId: string;
  username: string;
  callsign?: string;
  role: UserRole;
  token: string;
  expiresAt: string;
}

export interface SecurityAuditRecord {
  id: string;
  userId: string;
  action: string;
  targetResource: string;
  ipAddress: string;
  timestamp: string;
  status: 'SUCCESS' | 'DENIED' | 'FLAGGED';
}

export interface SecurityAuditLog {
  id: string;
  userId: string;
  callsign?: string;
  action: string;
  resource: string;
  result: string;
  timestamp: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: UserRole;
  callsign: string;
}
