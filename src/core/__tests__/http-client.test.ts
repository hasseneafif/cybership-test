import axios, { AxiosError } from 'axios';
import { HttpClient } from '../http-client';
import { NetworkError, RateLimitError, CarrierAPIError } from '../../types/errors';

jest.mock('axios');

describe('HttpClient', () => {
  let httpClient: HttpClient;
  const mockAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAxios.create = jest.fn().mockReturnValue({
      request: jest.fn(),
      defaults: {
        headers: {
          common: {}
        }
      }
    });

    httpClient = new HttpClient({
      baseURL: 'https://api.example.com',
      timeout: 5000
    });
  });

  describe('successful requests', () => {
    it('should make GET request and return data', async () => {
      const mockData = { result: 'success' };
      const mockInstance = mockAxios.create();
      mockInstance.request = jest.fn().mockResolvedValue({ data: mockData });

      const result = await httpClient.get('/test');
      
      expect(mockInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/test'
        })
      );
      expect(result).toEqual(mockData);
    });

    it('should make POST request with data', async () => {
      const mockData = { id: 123 };
      const postData = { name: 'test' };
      const mockInstance = mockAxios.create();
      mockInstance.request = jest.fn().mockResolvedValue({ data: mockData });

      const result = await httpClient.post('/create', postData);
      
      expect(mockInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/create',
          data: postData
        })
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('error handling', () => {
    it('should throw NetworkError on timeout', async () => {
      const mockInstance = mockAxios.create();
      const timeoutError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
        response: undefined
      } as AxiosError;

      mockInstance.request = jest.fn().mockRejectedValue(timeoutError);
      mockAxios.isAxiosError = jest.fn().mockReturnValue(true);

      await expect(httpClient.get('/test')).rejects.toThrow(NetworkError);
      await expect(httpClient.get('/test')).rejects.toThrow('Request timeout');
    });

    it('should throw NetworkError on network failure', async () => {
      const mockInstance = mockAxios.create();
      const networkError = {
        isAxiosError: true,
        message: 'Network Error',
        response: undefined
      } as AxiosError;

      mockInstance.request = jest.fn().mockRejectedValue(networkError);
      mockAxios.isAxiosError = jest.fn().mockReturnValue(true);

      await expect(httpClient.get('/test')).rejects.toThrow(NetworkError);
    });

    it('should throw RateLimitError on 429 status', async () => {
      const mockInstance = mockAxios.create();
      const rateLimitError = {
        isAxiosError: true,
        response: {
          status: 429,
          data: { error: 'Too many requests' },
          headers: { 'retry-after': '60' }
        }
      } as AxiosError;

      mockInstance.request = jest.fn().mockRejectedValue(rateLimitError);
      mockAxios.isAxiosError = jest.fn().mockReturnValue(true);

      await expect(httpClient.get('/test')).rejects.toThrow(RateLimitError);
    });

    it('should throw CarrierAPIError on 4xx status', async () => {
      const mockInstance = mockAxios.create();
      const apiError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { error: 'Bad request' }
        }
      } as AxiosError;

      mockInstance.request = jest.fn().mockRejectedValue(apiError);
      mockAxios.isAxiosError = jest.fn().mockReturnValue(true);

      await expect(httpClient.get('/test')).rejects.toThrow(CarrierAPIError);
    });

    it('should throw CarrierAPIError on 5xx status', async () => {
      const mockInstance = mockAxios.create();
      const serverError = {
        isAxiosError: true,
        response: {
          status: 503,
          data: { error: 'Service unavailable' }
        }
      } as AxiosError;

      mockInstance.request = jest.fn().mockRejectedValue(serverError);
      mockAxios.isAxiosError = jest.fn().mockReturnValue(true);

      await expect(httpClient.get('/test')).rejects.toThrow(CarrierAPIError);
    });
  });

  describe('setAuthHeader', () => {
    it('should set authorization header', () => {
      const mockInstance = mockAxios.create();
      httpClient.setAuthHeader('test_token_123');

      expect(mockInstance.defaults.headers.common['Authorization']).toBe('Bearer test_token_123');
    });
  });
});
