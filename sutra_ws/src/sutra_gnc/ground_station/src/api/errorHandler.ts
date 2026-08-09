import { AxiosError } from 'axios';

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export class GlobalErrorHandler {
  static handle(error: unknown): ApiError {
    const timestamp = new Date().toISOString();

    if ((error as AxiosError).isAxiosError) {
      const axiosError = error as AxiosError<any>;
      
      if (!axiosError.response) {
        return {
          statusCode: 0,
          code: 'ERR_NETWORK_OFFLINE',
          message: 'Network offline or ground station API server unreachable.',
          timestamp
        };
      }

      const status = axiosError.response.status;
      const data = axiosError.response.data;

      switch (status) {
        case 401:
          return {
            statusCode: 401,
            code: 'ERR_UNAUTHORIZED',
            message: data?.detail || 'Operator session expired or invalid credentials.',
            timestamp
          };
        case 403:
          return {
            statusCode: 403,
            code: 'ERR_FORBIDDEN',
            message: 'Clearance level insufficient to execute command.',
            timestamp
          };
        case 404:
          return {
            statusCode: 404,
            code: 'ERR_NOT_FOUND',
            message: data?.detail || 'Requested drone asset or mission resource not found.',
            timestamp
          };
        case 422:
          return {
            statusCode: 422,
            code: 'ERR_VALIDATION',
            message: 'Invalid payload format for FastAPI endpoint.',
            details: data?.detail,
            timestamp
          };
        case 500:
        default:
          return {
            statusCode: status,
            code: 'ERR_SERVER_ERROR',
            message: data?.detail || 'Internal avionics server or MAVLink gateway error.',
            timestamp
          };
      }
    }

    return {
      statusCode: 500,
      code: 'ERR_UNKNOWN',
      message: (error as Error).message || 'An unexpected error occurred.',
      timestamp
    };
  }
}
