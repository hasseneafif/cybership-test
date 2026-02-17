import { RateRequest, RateQuote } from '../types/common';

// Core interface that all carriers must implement
// This keeps UPS, FedEx, USPS, etc. completely isolated from each other
export interface ICarrier {
  readonly name: string;
  
  // Get shipping rates for a given request
  getRates(request: RateRequest): Promise<RateQuote[]>;
  
  // Future operations would go here:
  // createLabel(request: LabelRequest): Promise<Label>;
  // trackShipment(trackingNumber: string): Promise<TrackingInfo>;
  // validateAddress(address: Address): Promise<AddressValidation>;
}

// Auth provider interface - carriers can implement their own auth
export interface IAuthProvider {
  getAccessToken(): Promise<string>;
}
