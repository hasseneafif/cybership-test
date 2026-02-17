import { UPSAuthProvider } from '../auth';
import { HttpClient } from '../../../core/http-client';
import { AuthenticationError } from '../../../types/errors';

jest.mock('../../../core/http-client');

describe('UPSAuthProvider', () => {
  let authProvider: UPSAuthProvider;
  let mockHttpClient: jest.Mocked<HttpClient>;

  const testConfig = {
    clientId: 'test_client_id',
    clientSecret: 'test_secret',
    authBaseURL: 'https://test.ups.com/auth'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpClient = new HttpClient({ baseURL: '' }) as jest.Mocked<HttpClient>;
    (HttpClient as jest.MockedClass<typeof HttpClient>).mockImplementation(() => mockHttpClient);
    
    authProvider = new UPSAuthProvider(testConfig);
  });

  describe('getAccessToken', () => {
    it('should fetch and return a new token', async () => {
      const mockTokenResponse = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        token_type: 'Bearer',
        expires_in: 3600,
        issued_at: '1234567890'
      };

      mockHttpClient.post = jest.fn().mockResolvedValue(mockTokenResponse);

      const token = await authProvider.getAccessToken();

      expect(token).toBe(mockTokenResponse.access_token);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/oauth/token',
        'grant_type=client_credentials',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic '),
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
    });

    it('should cache and reuse valid tokens', async () => {
      const mockTokenResponse = {
        access_token: 'cached_token_abc123',
        token_type: 'Bearer',
        expires_in: 3600,
        issued_at: '1234567890'
      };

      mockHttpClient.post = jest.fn().mockResolvedValue(mockTokenResponse);

      // First call - should fetch
      const token1 = await authProvider.getAccessToken();
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const token2 = await authProvider.getAccessToken();
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1); // Still 1
      expect(token1).toBe(token2);
    });

    it('should refresh expired tokens', async () => {
      const firstToken = {
        access_token: 'first_token',
        token_type: 'Bearer',
        expires_in: 1, // Expires in 1 second
        issued_at: '1234567890'
      };

      const secondToken = {
        access_token: 'second_token',
        token_type: 'Bearer',
        expires_in: 3600,
        issued_at: '1234567891'
      };

      mockHttpClient.post = jest.fn()
        .mockResolvedValueOnce(firstToken)
        .mockResolvedValueOnce(secondToken);

      // Get first token
      const token1 = await authProvider.getAccessToken();
      expect(token1).toBe('first_token');

      // Wait for token to expire (plus buffer)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should fetch new token
      const token2 = await authProvider.getAccessToken();
      expect(token2).toBe('second_token');
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });

    it('should throw AuthenticationError on failure', async () => {
      mockHttpClient.post = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(authProvider.getAccessToken()).rejects.toThrow(AuthenticationError);
    });

    it('should encode credentials correctly', async () => {
      const mockTokenResponse = {
        access_token: 'token',
        token_type: 'Bearer',
        expires_in: 3600,
        issued_at: '1234567890'
      };

      mockHttpClient.post = jest.fn().mockResolvedValue(mockTokenResponse);

      await authProvider.getAccessToken();

      const expectedCredentials = Buffer.from(
        `${testConfig.clientId}:${testConfig.clientSecret}`
      ).toString('base64');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Basic ${expectedCredentials}`
          })
        })
      );
    });
  });
});
