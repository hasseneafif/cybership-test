import { UPSCarrier } from '../carrier';
import { HttpClient } from '../../../core/http-client';
import { UPSAuthProvider } from '../auth';
import { RateRequest } from '../../../types/common';
import { ValidationError } from '../../../types/errors';

// Mock the dependencies
jest.mock('../../../core/http-client');
jest.mock('../auth');

describe('UPSCarrier', () => {
  let carrier: UPSCarrier;
  let mockHttpClient: jest.Mocked<HttpClient>;
  let mockAuthProvider: jest.Mocked<UPSAuthProvider>;

  const testConfig = {
    clientId: 'test_client',
    clientSecret: 'test_secret',
    accountNumber: 'TEST123',
    apiBaseURL: 'https://test.ups.com/api',
    authBaseURL: 'https://test.ups.com/auth'
  };

  const validRateRequest: RateRequest = {
    origin: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'US'
    },
    destination: {
      street: '456 Oak Ave',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US'
    },
    packages: [
      {
        length: 10,
        width: 8,
        height: 6,
        weight: 5,
        dimensionUnit: 'IN',
        weightUnit: 'LBS'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockHttpClient = new HttpClient({ baseURL: '' }) as jest.Mocked<HttpClient>;
    mockAuthProvider = new UPSAuthProvider(testConfig) as jest.Mocked<UPSAuthProvider>;
    
    (HttpClient as jest.MockedClass<typeof HttpClient>).mockImplementation(() => mockHttpClient);
    (UPSAuthProvider as jest.MockedClass<typeof UPSAuthProvider>).mockImplementation(() => mockAuthProvider);
    
    carrier = new UPSCarrier(testConfig);
  });

  describe('getRates', () => {
    it('should successfully fetch and parse rates', async () => {
      // Mock successful auth
      mockAuthProvider.getAccessToken = jest.fn().mockResolvedValue('mock_token_12345');
      
      // Mock successful rate response from UPS docs
      const mockUPSResponse = {
        RateResponse: {
          Response: {
            ResponseStatus: {
              Code: '1',
              Description: 'Success'
            }
          },
          RatedShipment: [
            {
              Service: {
                Code: '03'
              },
              TotalCharges: {
                CurrencyCode: 'USD',
                MonetaryValue: '25.43'
              },
              TransportationCharges: {
                CurrencyCode: 'USD',
                MonetaryValue: '23.50'
              },
              ServiceOptionsCharges: {
                CurrencyCode: 'USD',
                MonetaryValue: '1.93'
              },
              GuaranteedDelivery: {
                BusinessDaysInTransit: '3'
              },
              BillingWeight: {
                UnitOfMeasurement: {
                  Code: 'LBS'
                },
                Weight: '5'
              }
            },
            {
              Service: {
                Code: '02'
              },
              TotalCharges: {
                CurrencyCode: 'USD',
                MonetaryValue: '45.67'
              },
              TransportationCharges: {
                CurrencyCode: 'USD',
                MonetaryValue: '43.00'
              },
              GuaranteedDelivery: {
                BusinessDaysInTransit: '2'
              }
            }
          ]
        }
      };

      mockHttpClient.post = jest.fn().mockResolvedValue(mockUPSResponse);
      mockHttpClient.setAuthHeader = jest.fn();

      const quotes = await carrier.getRates(validRateRequest);

      // Verify auth was called
      expect(mockAuthProvider.getAccessToken).toHaveBeenCalled();
      expect(mockHttpClient.setAuthHeader).toHaveBeenCalledWith('mock_token_12345');

      // Verify API call
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/rating/v1/Rate',
        expect.objectContaining({
          RateRequest: expect.objectContaining({
            Shipment: expect.any(Object)
          })
        }),
        expect.any(Object)
      );

      // Verify parsed quotes
      expect(quotes).toHaveLength(2);
      
      expect(quotes[0]).toEqual({
        carrier: 'UPS',
        service: '03',
        serviceName: 'UPS Ground',
        totalCost: 25.43,
        currency: 'USD',
        deliveryDays: 3,
        metadata: expect.objectContaining({
          transportationCharges: '23.50',
          billingWeight: '5'
        })
      });

      expect(quotes[1]).toEqual({
        carrier: 'UPS',
        service: '02',
        serviceName: 'UPS 2nd Day Air',
        totalCost: 45.67,
        currency: 'USD',
        deliveryDays: 2,
        metadata: expect.any(Object)
      });
    });

    it('should build correct request payload with service level', async () => {
      mockAuthProvider.getAccessToken = jest.fn().mockResolvedValue('token');
      mockHttpClient.post = jest.fn().mockResolvedValue({
        RateResponse: {
          Response: { ResponseStatus: { Code: '1', Description: 'Success' } },
          RatedShipment: []
        }
      });
      mockHttpClient.setAuthHeader = jest.fn();

      const requestWithService = {
        ...validRateRequest,
        serviceLevel: 'GROUND'
      };

      await carrier.getRates(requestWithService);

      const callArgs = (mockHttpClient.post as jest.Mock).mock.calls[0];
      const payload = callArgs[1];

      expect(payload.RateRequest.Shipment.Service).toEqual({
        Code: '03' // GROUND maps to 03
      });
    });

    it('should throw ValidationError for empty packages', async () => {
      const invalidRequest = {
        ...validRateRequest,
        packages: []
      };

      await expect(carrier.getRates(invalidRequest)).rejects.toThrow(ValidationError);
    });

    it('should handle empty rate response', async () => {
      mockAuthProvider.getAccessToken = jest.fn().mockResolvedValue('token');
      mockHttpClient.post = jest.fn().mockResolvedValue({
        RateResponse: {
          Response: { ResponseStatus: { Code: '1', Description: 'Success' } },
          RatedShipment: []
        }
      });
      mockHttpClient.setAuthHeader = jest.fn();

      const quotes = await carrier.getRates(validRateRequest);
      expect(quotes).toEqual([]);
    });
  });
});
