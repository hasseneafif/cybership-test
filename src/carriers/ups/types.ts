// UPS-specific request/response types based on their API docs
// These are internal to the UPS carrier implementation

export interface UPSRateRequest {
  RateRequest: {
    Request: {
      TransactionReference?: {
        CustomerContext?: string;
      };
    };
    Shipment: {
      Shipper: {
        Name?: string;
        ShipperNumber?: string;
        Address: {
          AddressLine?: string[];
          City: string;
          StateProvinceCode: string;
          PostalCode: string;
          CountryCode: string;
        };
      };
      ShipTo: {
        Name?: string;
        Address: {
          AddressLine?: string[];
          City: string;
          StateProvinceCode: string;
          PostalCode: string;
          CountryCode: string;
        };
      };
      ShipFrom: {
        Name?: string;
        Address: {
          AddressLine?: string[];
          City: string;
          StateProvinceCode: string;
          PostalCode: string;
          CountryCode: string;
        };
      };
      Service?: {
        Code: string;
      };
      Package: Array<{
        PackagingType: {
          Code: string;
        };
        Dimensions: {
          UnitOfMeasurement: {
            Code: string;
          };
          Length: string;
          Width: string;
          Height: string;
        };
        PackageWeight: {
          UnitOfMeasurement: {
            Code: string;
          };
          Weight: string;
        };
      }>;
    };
  };
}

export interface UPSRateResponse {
  RateResponse: {
    Response: {
      ResponseStatus: {
        Code: string;
        Description: string;
      };
      Alert?: Array<{
        Code: string;
        Description: string;
      }>;
    };
    RatedShipment: Array<{
      Service: {
        Code: string;
      };
      RatedShipmentAlert?: Array<{
        Code: string;
        Description: string;
      }>;
      BillingWeight?: {
        UnitOfMeasurement: {
          Code: string;
        };
        Weight: string;
      };
      TransportationCharges: {
        CurrencyCode: string;
        MonetaryValue: string;
      };
      ServiceOptionsCharges?: {
        CurrencyCode: string;
        MonetaryValue: string;
      };
      TotalCharges: {
        CurrencyCode: string;
        MonetaryValue: string;
      };
      GuaranteedDelivery?: {
        BusinessDaysInTransit: string;
      };
    }>;
  };
}

// Service code mappings
export const UPS_SERVICE_CODES: Record<string, string> = {
  'GROUND': '03',
  'NEXT_DAY_AIR': '01',
  '2ND_DAY_AIR': '02',
  '3_DAY_SELECT': '12',
  'NEXT_DAY_AIR_SAVER': '13',
  'NEXT_DAY_AIR_EARLY': '14',
  '2ND_DAY_AIR_AM': '59',
  'WORLDWIDE_EXPRESS': '07',
  'WORLDWIDE_EXPEDITED': '08',
  'STANDARD': '11',
  'WORLDWIDE_SAVER': '65'
};

export const UPS_SERVICE_NAMES: Record<string, string> = {
  '01': 'UPS Next Day Air',
  '02': 'UPS 2nd Day Air',
  '03': 'UPS Ground',
  '12': 'UPS 3 Day Select',
  '13': 'UPS Next Day Air Saver',
  '14': 'UPS Next Day Air Early',
  '59': 'UPS 2nd Day Air A.M.',
  '07': 'UPS Worldwide Express',
  '08': 'UPS Worldwide Expedited',
  '11': 'UPS Standard',
  '65': 'UPS Worldwide Saver'
};
