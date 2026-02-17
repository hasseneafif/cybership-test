// Main entry point - export public API
export { CarrierService } from './carrier-service';
export { UPSCarrier } from './carriers/ups/carrier';
export type { UPSCarrierConfig } from './carriers/ups/carrier';

export type { ICarrier, IAuthProvider } from './core/carrier.interface';
export type { 
  Address, 
  Package, 
  RateRequest, 
  RateQuote 
} from './types/common';

export {
  CarrierError,
  AuthenticationError,
  ValidationError,
  NetworkError,
  RateLimitError,
  CarrierAPIError
} from './types/errors';

export { config } from './config';
