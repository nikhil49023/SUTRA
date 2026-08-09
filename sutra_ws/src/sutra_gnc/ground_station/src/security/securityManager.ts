import { AuthenticationService } from './authenticationService';
import { AuthorizationService } from './authorizationService';
import { RBACEngine, SecurityPermission } from './rbacEngine';
import { AuditLogger } from './auditLogger';

export class SecurityManager {
  private static instance: SecurityManager;
  private authService: AuthenticationService = new AuthenticationService();

  private constructor() {}

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  public getAuthService(): AuthenticationService {
    return this.authService;
  }

  public authorizeCommand(commandName: string): boolean {
    const session = this.authService.getActiveSession();
    return AuthorizationService.authorizeCommand(session, commandName);
  }

  public authorizePermission(permission: SecurityPermission): boolean {
    const session = this.authService.getActiveSession();
    if (!session) return false;
    return RBACEngine.hasPermission(session.role, permission);
  }

  public getAuditLogs() {
    return AuditLogger.getLogs();
  }
}

export const securityManager = SecurityManager.getInstance();
