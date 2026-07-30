export type RoleLevel = 'COMMANDER' | 'OPERATOR' | 'ANALYST' | 'VIEWER';

export interface UserSession {
  userId: string;
  callsign: string;
  role: RoleLevel;
  clearanceLevel: number;
  token: string;
  loginTime: string;
  expiresAt: string;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  callsign: string;
  action: string;
  resource: string;
  status: 'GRANTED' | 'DENIED' | 'SUCCESS' | 'FAILURE';
  ipAddress: string;
}

export interface TeamMember {
  userId: string;
  name: string;
  callsign: string;
  role: RoleLevel;
  clearanceLevel: number;
  assignedDrones: string[];
}
