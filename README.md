# Carrier Integration Service

Production-ready TypeScript service for shipping carrier integrations. Currently supports UPS Rating API with an extensible architecture for adding more carriers.

## Design

Built around carrier abstraction - callers use normalized domain models and never touch carrier-specific APIs. Each carrier is a self-contained module implementing `ICarrier` interface. OAuth token management, validation, and error handling are baked in.

```
src/
├── core/                    # Shared interfaces and HTTP client
├── carriers/ups/            # UPS implementation (auth, types, carrier)
├── types/                   # Domain models and errors
└── carrier-service.ts       # Main orchestration
```

## Setup

```bash
npm install
cp .env.example .env  # Add your UPS credentials
```

## Usage

```typescript
import { CarrierService, UPSCarrier } from './src';

const service = new CarrierService();
service.registerCarrier(new UPSCarrier({ /* config */ }));

const quotes = await service.getRates('UPS', {
  origin: { street: '123 Main St', city: 'Atlanta', state: 'GA', postalCode: '30301', country: 'US' },
  destination: { street: '456 Oak Ave', city: 'Seattle', state: 'WA', postalCode: '98101', country: 'US' },
  packages: [{ length: 12, width: 10, height: 8, weight: 15, dimensionUnit: 'IN', weightUnit: 'LBS' }]
});
```

See `src/example.ts` for a complete working example.

## Tests

Integration tests use stubbed HTTP responses to verify request building, response parsing, auth lifecycle, and error handling.

```bash
npm test
npm test -- --coverage
```

## Extending

**New Carrier**: Create `src/carriers/fedex/`, implement `ICarrier`, register with service. UPS code stays untouched.

**New Operation**: Add method to `ICarrier` interface (e.g., `createLabel()`), implement in each carrier.

## Future Improvements

- Retry logic with exponential backoff
- Rate quote caching for identical requests
- Structured logging with correlation IDs
- Metrics instrumentation
- Address validation before rating
- Config validation at startup

## Errors

All errors extend `CarrierError` with structured details:
- `ValidationError` - Invalid input
- `AuthenticationError` - OAuth failures
- `NetworkError` - Timeouts, connection issues
- `RateLimitError` - 429 responses
- `CarrierAPIError` - 4xx/5xx from carrier
