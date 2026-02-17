import { ICarrier } from './core/carrier.interface';
import { RateRequest, RateRequestSchema, RateQuote } from './types/common';
import { ValidationError } from './types/errors';

// Main service that orchestrates carrier operations
// This is what external code interacts with
export class CarrierService {
  private carriers: Map<string, ICarrier> = new Map();

  // Register a carrier implementation
  registerCarrier(carrier: ICarrier): void {
    this.carriers.set(carrier.name.toUpperCase(), carrier);
  }

  // Get rates from a specific carrier
  async getRates(carrierName: string, request: RateRequest): Promise<RateQuote[]> {
    // Validate the request first
    const validationResult = RateRequestSchema.safeParse(request);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid rate request',
        validationResult.error.errors
      );
    }

    const carrier = this.carriers.get(carrierName.toUpperCase());
    if (!carrier) {
      throw new ValidationError(`Unknown carrier: ${carrierName}`);
    }

    return carrier.getRates(validationResult.data);
  }

  // Get rates from all registered carriers
  async getAllRates(request: RateRequest): Promise<RateQuote[]> {
    const validationResult = RateRequestSchema.safeParse(request);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid rate request',
        validationResult.error.errors
      );
    }

    const promises = Array.from(this.carriers.values()).map(carrier =>
      carrier.getRates(validationResult.data).catch(error => {
        // Log but don't fail if one carrier errors
        console.error(`Failed to get rates from ${carrier.name}:`, error);
        return [];
      })
    );

    const results = await Promise.all(promises);
    return results.flat();
  }

  // List available carriers
  getAvailableCarriers(): string[] {
    return Array.from(this.carriers.keys());
  }
}
