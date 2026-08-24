/**
 * Smart Horizon GCS — Authentication Client Bridge
 * Subsystem: Security & Governance (Phase 13)
 */

import { wsClient } from '../communication/WebSocketClient';
import { useAuthStore } from './authStore';

class AuthClient {
  public login(username: string, password: string): Promise<boolean> {
    useAuthStore.getState().setSessionStatus('AUTHENTICATING');
    return new Promise((resolve) => {
      wsClient.sendEnvelope('auth.login', { username, password });
      // Temporary resolve handler; response handled by MessageRouter
      const timeout = setTimeout(() => {
        useAuthStore.getState().setSessionStatus('UNAUTHENTICATED');
        resolve(false);
      }, 5000);

      const checkAuth = () => {
        const auth = useAuthStore.getState();
        if (auth.isAuthenticated) {
          clearTimeout(timeout);
          resolve(true);
        } else if (auth.lastAuthError) {
          clearTimeout(timeout);
          resolve(false);
        }
      };

      const unsub = useAuthStore.subscribe(checkAuth);
    });
  }

  public resumeSession(): void {
    const token = localStorage.getItem('smart_horizon_auth_token');
    if (token) {
      wsClient.sendEnvelope('auth.resume_session', { token });
    }
  }

  public logout(): void {
    const sessionId = useAuthStore.getState().sessionId;
    if (sessionId) {
      wsClient.sendEnvelope('auth.logout', { session_id: sessionId });
    }
    useAuthStore.getState().logout();
  }
}

export const authClient = new AuthClient();
