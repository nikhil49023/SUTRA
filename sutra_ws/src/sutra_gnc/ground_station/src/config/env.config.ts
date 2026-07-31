export interface EnvConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
  fastApiBaseUrl: string;
  useMockFallback: boolean;
  requestTimeoutMs: number;
  maxRetryCount: number;
  environment: 'development' | 'production' | 'test';
}

export const ENV_CONFIG: EnvConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  wsBaseUrl: import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws/mavlink',
  fastApiBaseUrl: import.meta.env.VITE_FASTAPI_BASE_URL || 'http://localhost:8000',
  useMockFallback: import.meta.env.VITE_USE_MOCK === 'false' ? false : true,
  requestTimeoutMs: 10000,
  maxRetryCount: 3,
  environment: (import.meta.env.MODE as any) || 'development'
};
