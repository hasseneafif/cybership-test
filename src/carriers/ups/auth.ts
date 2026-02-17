import { IAuthProvider } from '../../core/carrier.interface';
import { HttpClient } from '../../core/http-client';
import { AuthenticationError } from '../../types/errors';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  issued_at: string;
}

interface UPSAuthConfig {
  clientId: string;
  clientSecret: string;
  authBaseURL: string;
}

export class UPSAuthProvider implements IAuthProvider {
  private httpClient: HttpClient;
  private clientId: string;
  private clientSecret: string;
  
  // Token caching
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: UPSAuthConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.httpClient = new HttpClient({
      baseURL: config.authBaseURL,
      timeout: 10000
    });
  }

  async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.cachedToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.cachedToken;
    }

    return this.fetchNewToken();
  }

  private async fetchNewToken(): Promise<string> {
    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await this.httpClient.post<TokenResponse>(
        '/oauth/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.cachedToken = response.access_token;
      // expires_in is in seconds
      this.tokenExpiresAt = Date.now() + (response.expires_in * 1000);

      return this.cachedToken;
    } catch (error) {
      throw new AuthenticationError('Failed to obtain UPS access token', error);
    }
  }
}
