import { CarrierService } from './carrier-service';
import { UPSCarrier } from './carriers/ups/carrier';
import { config } from './config';
import { RateRequest } from './types/common';

// Simple example showing how to use the service
async function main() {
  const service = new CarrierService();

  // Initialize and register UPS carrier
  const upsCarrier = new UPSCarrier({
    clientId: config.ups.clientId,
    clientSecret: config.ups.clientSecret,
    accountNumber: config.ups.accountNumber,
    apiBaseURL: config.ups.apiBaseURL,
    authBaseURL: config.ups.authBaseURL,
    timeout: config.requestTimeout
  });

  service.registerCarrier(upsCarrier);

  // Build a rate request
  const request: RateRequest = {
    origin: {
      street: '1234 Shipping Lane',
      city: 'Atlanta',
      state: 'GA',
      postalCode: '30301',
      country: 'US'
    },
    destination: {
      street: '5678 Delivery St',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'US'
    },
    packages: [
      {
        length: 12,
        width: 10,
        height: 8,
        weight: 15,
        dimensionUnit: 'IN',
        weightUnit: 'LBS'
      }
    ],
    serviceLevel: 'GROUND' // Optional
  };

  try {
    console.log('Fetching rates from UPS...\n');
    
    const quotes = await service.getRates('UPS', request);
    
    console.log(`Found ${quotes.length} rate(s):\n`);
    
    quotes.forEach(quote => {
      console.log(`${quote.serviceName}`);
      console.log(`  Cost: ${quote.currency} ${quote.totalCost.toFixed(2)}`);
      if (quote.deliveryDays) {
        console.log(`  Delivery: ${quote.deliveryDays} business days`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error fetching rates:', error);
  }
}

// Only run if executed directly
if (require.main === module) {
  main();
}
