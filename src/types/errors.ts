// Base error for all carrier-related failures
export class CarrierError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CarrierError';
  }
}

// Authentication failures
export class AuthenticationError extends CarrierError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTH_FAILED', 401, details);
    this.name = 'AuthenticationError';
  }
}

// Validation errors before we even hit the API
export class ValidationError extends CarrierError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

// Network-level failures
export class NetworkError extends CarrierError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_ERROR', undefined, details);
    this.name = 'NetworkError';
  }
}

// Rate limiting from carrier
export class RateLimitError extends CarrierError {
  constructor(message: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

// Carrier API returned an error
export class CarrierAPIError extends CarrierError {
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message, 'CARRIER_API_ERROR', statusCode, details);
    this.name = 'CarrierAPIError';
  }
}
