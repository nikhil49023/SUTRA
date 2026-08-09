import { apiClient } from './apiClient';

export interface UserProfile {
  id: string;
  callsign: string;
  name: string;
  clearanceLevel: number;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

export class AuthApi {
  static async login(callsign: string, passkey: string): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<AuthResponse>('/auth/login', { callsign, passkey });
      apiClient.setToken(res.accessToken);
      return res;
    } catch (e) {
      // Mock Fallback for local testing
      const mockRes: AuthResponse = {
        accessToken: 'mock_jwt_token_level_4_vance',
        user: {
          id: 'USR-884',
          callsign: 'CAPT. VANCE',
          name: 'Capt. Alexander Vance',
          clearanceLevel: 4,
          role: 'LEVEL 4 OPERATOR'
        }
      };
      apiClient.setToken(mockRes.accessToken);
      return mockRes;
    }
  }

  static async getMe(): Promise<UserProfile> {
    try {
      return await apiClient.get<UserProfile>('/auth/me');
    } catch (e) {
      return {
        id: 'USR-884',
        callsign: 'CAPT. VANCE',
        name: 'Capt. Alexander Vance',
        clearanceLevel: 4,
        role: 'LEVEL 4 OPERATOR'
      };
    }
  }

  static async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      apiClient.setToken(null);
    }
  }
}
