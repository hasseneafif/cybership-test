import { ICarrier } from '../../core/carrier.interface';
import { RateRequest, RateQuote } from '../../types/common';
import { HttpClient } from '../../core/http-client';
import { UPSAuthProvider } from './auth';
import { ValidationError } from '../../types/errors';
import { 
  UPSRateRequest, 
  UPSRateResponse, 
  UPS_SERVICE_CODES, 
  UPS_SERVICE_NAMES 
} from './types';

export interface UPSCarrierConfig {
  clientId: string;
  clientSecret: string;
  accountNumber: string;
  apiBaseURL: string;
  authBaseURL: string;
  timeout?: number;
}

export class UPSCarrier implements ICarrier {
  readonly name = 'UPS';
  
  private httpClient: HttpClient;
  private authProvider: UPSAuthProvider;
  private accountNumber: string;

  constructor(config: UPSCarrierConfig) {
    this.accountNumber = config.accountNumber;
    
    this.authProvider = new UPSAuthProvider({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authBaseURL: config.authBaseURL
    });

    this.httpClient = new HttpClient({
      baseURL: config.apiBaseURL,
      timeout: config.timeout
    });
  }

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    // Build UPS-specific request payload
    const upsRequest = this.buildRateRequest(request);
    
    // Get auth token and set it
    const token = await this.authProvider.getAccessToken();
    this.httpClient.setAuthHeader(token);

    // Make the API call
    const response = await this.httpClient.post<UPSRateResponse>(
      '/rating/v1/Rate',
      upsRequest,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Parse and normalize the response
    return this.parseRateResponse(response);
  }

  private buildRateRequest(request: RateRequest): UPSRateRequest {
    const { origin, destination, packages, serviceLevel } = request;

    // Validate we have what we need
    if (packages.length === 0) {
      throw new ValidationError('At least one package is required');
    }

    const upsRequest: UPSRateRequest = {
      RateRequest: {
        Request: {
          TransactionReference: {
            CustomerContext: 'Rate Request'
          }
        },
        Shipment: {
          Shipper: {
            ShipperNumber: this.accountNumber,
            Address: {
              AddressLine: [origin.street],
              City: origin.city,
              StateProvinceCode: origin.state,
              PostalCode: origin.postalCode,
              CountryCode: origin.country
            }
          },
          ShipTo: {
            Address: {
              AddressLine: [destination.street],
              City: destination.city,
              StateProvinceCode: destination.state,
              PostalCode: destination.postalCode,
              CountryCode: destination.country
            }
          },
          ShipFrom: {
            Address: {
              AddressLine: [origin.street],
              City: origin.city,
              StateProvinceCode: origin.state,
              PostalCode: origin.postalCode,
              CountryCode: origin.country
            }
          },
          Package: packages.map(pkg => ({
            PackagingType: {
              Code: '02' // Customer supplied package
            },
            Dimensions: {
              UnitOfMeasurement: {
                Code: pkg.dimensionUnit
              },
              Length: pkg.length.toString(),
              Width: pkg.width.toString(),
              Height: pkg.height.toString()
            },
            PackageWeight: {
              UnitOfMeasurement: {
                Code: pkg.weightUnit
              },
              Weight: pkg.weight.toString()
            }
          }))
        }
      }
    };

    // If service level specified, add it
    if (serviceLevel && UPS_SERVICE_CODES[serviceLevel]) {
      upsRequest.RateRequest.Shipment.Service = {
        Code: UPS_SERVICE_CODES[serviceLevel]
      };
    }

    return upsRequest;
  }

  private parseRateResponse(response: UPSRateResponse): RateQuote[] {
    const ratedShipments = response.RateResponse.RatedShipment;
    
    if (!ratedShipments || ratedShipments.length === 0) {
      return [];
    }

    return ratedShipments.map(shipment => {
      const serviceCode = shipment.Service.Code;
      const serviceName = UPS_SERVICE_NAMES[serviceCode] || `UPS Service ${serviceCode}`;
      
      const deliveryDays = shipment.GuaranteedDelivery?.BusinessDaysInTransit
        ? parseInt(shipment.GuaranteedDelivery.BusinessDaysInTransit, 10)
        : undefined;

      return {
        carrier: this.name,
        service: serviceCode,
        serviceName,
        totalCost: parseFloat(shipment.TotalCharges.MonetaryValue),
        currency: shipment.TotalCharges.CurrencyCode,
        deliveryDays,
        metadata: {
          transportationCharges: shipment.TransportationCharges.MonetaryValue,
          serviceOptionsCharges: shipment.ServiceOptionsCharges?.MonetaryValue,
          billingWeight: shipment.BillingWeight?.Weight
        }
      };
    });
  }
}
