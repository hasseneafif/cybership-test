import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { NetworkError, CarrierAPIError, RateLimitError } from '../types/errors';

export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// Thin wrapper around axios to handle common error scenarios
export class HttpClient {
  private client: AxiosInstance;

  constructor(config: HttpClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: config.headers || {}
    });
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw this.handleAxiosError(error);
      }
      throw new NetworkError('Unexpected error during HTTP request', error);
    }
  }

  private handleAxiosError(error: AxiosError): Error {
    // No response means network issue
    if (!error.response) {
      return new NetworkError(
        error.code === 'ECONNABORTED' ? 'Request timeout' : 'Network error',
        { originalError: error.message }
      );
    }

    const { status, data } = error.response;

    // Rate limiting
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      return new RateLimitError(
        'Rate limit exceeded',
        retryAfter ? parseInt(retryAfter, 10) : undefined
      );
    }

    // Carrier API error
    return new CarrierAPIError(
      `Carrier API error: ${status}`,
      status,
      data
    );
  }

  // Allow setting auth headers dynamically
  setAuthHeader(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}
