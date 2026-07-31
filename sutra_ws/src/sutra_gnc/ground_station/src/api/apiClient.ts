import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ENV_CONFIG } from '../config/env.config';
import { GlobalErrorHandler, ApiError } from './errorHandler';

class ApiClient {
  private instance: AxiosInstance;
  private token: string | null = localStorage.getItem('gcs_auth_token');

  constructor() {
    this.instance = axios.create({
      baseURL: ENV_CONFIG.apiBaseUrl,
      timeout: ENV_CONFIG.requestTimeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('gcs_auth_token', token);
    } else {
      localStorage.removeItem('gcs_auth_token');
    }
  }

  private setupInterceptors() {
    // Request Interceptor
    this.instance.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor with retry & error handling
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const parsedError: ApiError = GlobalErrorHandler.handle(error);
        return Promise.reject(parsedError);
      }
    );
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
