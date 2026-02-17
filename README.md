# Carrier Integration Service

A production-ready TypeScript service for integrating with shipping carriers. Currently supports UPS Rating API with an extensible architecture for adding more carriers and operations.

## Design Philosophy

This service is built around a few core principles:

1. **Carrier Abstraction**: Callers never interact with carrier-specific APIs directly. All requests and responses use normalized domain models.

2. **Extensibility**: Adding a new carrier (FedEx, USPS) or operation (labels, tracking) doesn't require touching existing code. Each carrier is a self-contained module implementing a common interface.

3. **Type Safety**: Strong TypeScript types throughout, with runtime validation using Zod schemas to catch issues before they hit external APIs.

4. **Resilient Auth**: OAuth token lifecycle is handled transparently - acquisition, caching, and refresh happen automatically without caller involvement.

5. **Structured Errors**: All failures produce typed, actionable errors with context. No generic "something went wrong" messages.

## Architecture

```
src/
├── core/
│   ├── carrier.interface.ts    # ICarrier interface all carriers implement
│   └── http-client.ts           # HTTP wrapper with error handling
├── carriers/
│   └── ups/
│       ├── carrier.ts           # UPS implementation
│       ├── auth.ts              # OAuth token management
│       └── types.ts             # UPS-specific request/response types
├── types/
│   ├── common.ts                # Shared domain models (Address, Package, etc.)
│   └── errors.ts                # Error hierarchy
└── carrier-service.ts           # Main orchestration layer
```

### Key Components

**CarrierService**: The main entry point. Manages carrier registration and routes requests to the appropriate carrier implementation.

**ICarrier Interface**: Defines the contract all carriers must follow. Currently just `getRates()`, but designed to expand with `createLabel()`, `trackShipment()`, etc.

**UPSCarrier**: Implements ICarrier for UPS. Handles request transformation, response parsing, and delegates auth to UPSAuthProvider.

**UPSAuthProvider**: Manages OAuth 2.0 client credentials flow. Caches tokens and refreshes them transparently when they expire.

**HttpClient**: Thin axios wrapper that translates HTTP errors into our structured error types.

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `UPS_CLIENT_ID`: Your UPS API client ID
- `UPS_CLIENT_SECRET`: Your UPS API client secret  
- `UPS_ACCOUNT_NUMBER`: Your UPS shipper account number
- `UPS_API_BASE_URL`: API base URL (sandbox or production)
- `UPS_AUTH_BASE_URL`: Auth endpoint URL

## Usage

```typescript
import { CarrierService, UPSCarrier, RateRequest } from './src';

const service = new CarrierService();

// Register UPS
const ups = new UPSCarrier({
  clientId: process.env.UPS_CLIENT_ID!,
  clientSecret: process.env.UPS_CLIENT_SECRET!,
  accountNumber: process.env.UPS_ACCOUNT_NUMBER!,
  apiBaseURL: process.env.UPS_API_BASE_URL!,
  authBaseURL: process.env.UPS_AUTH_BASE_URL!
});

service.registerCarrier(ups);

// Get rates
const request: RateRequest = {
  origin: {
    street: '123 Main St',
    city: 'Atlanta',
    state: 'GA',
    postalCode: '30301',
    country: 'US'
  },
  destination: {
    street: '456 Oak Ave',
    city: 'Seattle',
    state: 'WA',
    postalCode: '98101',
    country: 'US'
  },
  packages: [{
    length: 12,
    width: 10,
    height: 8,
    weight: 15,
    dimensionUnit: 'IN',
    weightUnit: 'LBS'
  }]
};

const quotes = await service.getRates('UPS', request);
```

## Running Tests

The test suite uses stubbed HTTP responses based on UPS documentation to verify:
- Request payload construction
- Response parsing and normalization
- Auth token lifecycle (acquisition, caching, refresh)
- Error handling (network failures, API errors, rate limiting)

```bash
npm test
```

Run with coverage:
```bash
npm test -- --coverage
```

## Adding a New Carrier

To add FedEx, USPS, or another carrier:

1. Create `src/carriers/fedex/` directory
2. Implement `ICarrier` interface in `carrier.ts`
3. Create carrier-specific types in `types.ts`
4. Implement auth if needed (or reuse patterns from UPS)
5. Register with CarrierService

Example skeleton:

```typescript
export class FedExCarrier implements ICarrier {
  readonly name = 'FedEx';
  
  async getRates(request: RateRequest): Promise<RateQuote[]> {
    // Transform request to FedEx format
    // Make API call
    // Parse and normalize response
  }
}
```

The beauty of this design: UPS code never knows FedEx exists, and vice versa.

## Adding New Operations

To add label creation, tracking, or address validation:

1. Add method to `ICarrier` interface
2. Define domain types in `types/common.ts`
3. Implement in each carrier

```typescript
export interface ICarrier {
  readonly name: string;
  getRates(request: RateRequest): Promise<RateQuote[]>;
  createLabel(request: LabelRequest): Promise<Label>;  // New operation
}
```

## What I'd Improve With More Time

**Retry Logic**: Add exponential backoff for transient failures and rate limiting. Right now we fail fast.

**Caching**: Cache rate quotes for identical requests within a short window. Shipping rates don't change every second.

**Logging**: Structured logging with correlation IDs to trace requests through the system. Currently just console.error in a few places.

**Metrics**: Instrument with metrics (request duration, error rates, cache hit rates) for observability in production.

**Webhook Support**: For async operations like tracking updates, add webhook handling infrastructure.

**Address Validation**: Validate addresses before rating to catch issues early and improve success rates.

**Multi-Package Optimization**: Some carriers offer better rates when consolidating packages. Add logic to explore those options.

**Rate Shopping Intelligence**: When calling `getAllRates()`, add filtering/sorting by cost, delivery time, or carrier preference.

**Configuration Validation**: Validate config at startup rather than failing on first request.

**Documentation**: Add JSDoc comments throughout for better IDE autocomplete and generated docs.

## Error Handling

All errors extend `CarrierError` and include:
- `code`: Machine-readable error code
- `message`: Human-readable description
- `statusCode`: HTTP status if applicable
- `details`: Additional context

Error types:
- `ValidationError`: Invalid input before API call
- `AuthenticationError`: OAuth failures
- `NetworkError`: Timeouts, connection issues
- `RateLimitError`: 429 responses (includes retry-after)
- `CarrierAPIError`: 4xx/5xx from carrier API

## License

MIT
