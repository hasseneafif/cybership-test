import { CarrierService } from '../carrier-service';
import { ICarrier } from '../core/carrier.interface';
import { RateRequest, RateQuote } from '../types/common';
import { ValidationError } from '../types/errors';

describe('CarrierService', () => {
  let service: CarrierService;
  let mockCarrier: jest.Mocked<ICarrier>;

  const validRequest: RateRequest = {
    origin: {
      street: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
      country: 'US'
    },
    destination: {
      street: '456 Broadway',
      city: 'Boston',
      state: 'MA',
      postalCode: '02101',
      country: 'US'
    },
    packages: [
      {
        length: 12,
        width: 10,
        height: 8,
        weight: 10,
        dimensionUnit: 'IN',
        weightUnit: 'LBS'
      }
    ]
  };

  beforeEach(() => {
    service = new CarrierService();
    
    mockCarrier = {
      name: 'TestCarrier',
      getRates: jest.fn()
    };
  });

  describe('registerCarrier', () => {
    it('should register a carrier', () => {
      service.registerCarrier(mockCarrier);
      expect(service.getAvailableCarriers()).toContain('TESTCARRIER');
    });

    it('should allow multiple carriers', () => {
      const carrier2: ICarrier = {
        name: 'AnotherCarrier',
        getRates: jest.fn()
      };

      service.registerCarrier(mockCarrier);
      service.registerCarrier(carrier2);

      const carriers = service.getAvailableCarriers();
      expect(carriers).toHaveLength(2);
      expect(carriers).toContain('TESTCARRIER');
      expect(carriers).toContain('ANOTHERCARRIER');
    });
  });

  describe('getRates', () => {
    beforeEach(() => {
      service.registerCarrier(mockCarrier);
    });

    it('should get rates from specified carrier', async () => {
      const mockQuotes: RateQuote[] = [
        {
          carrier: 'TestCarrier',
          service: 'GROUND',
          serviceName: 'Ground Shipping',
          totalCost: 15.99,
          currency: 'USD'
        }
      ];

      mockCarrier.getRates.mockResolvedValue(mockQuotes);

      const quotes = await service.getRates('TestCarrier', validRequest);

      expect(mockCarrier.getRates).toHaveBeenCalledWith(validRequest);
      expect(quotes).toEqual(mockQuotes);
    });

    it('should be case-insensitive for carrier names', async () => {
      mockCarrier.getRates.mockResolvedValue([]);

      await service.getRates('testcarrier', validRequest);
      await service.getRates('TESTCARRIER', validRequest);
      await service.getRates('TestCarrier', validRequest);

      expect(mockCarrier.getRates).toHaveBeenCalledTimes(3);
    });

    it('should throw ValidationError for unknown carrier', async () => {
      await expect(
        service.getRates('UnknownCarrier', validRequest)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate request before calling carrier', async () => {
      const invalidRequest = {
        ...validRequest,
        packages: [] // Empty packages array
      };

      await expect(
        service.getRates('TestCarrier', invalidRequest as RateRequest)
      ).rejects.toThrow(ValidationError);

      expect(mockCarrier.getRates).not.toHaveBeenCalled();
    });

    it('should reject invalid addresses', async () => {
      const invalidRequest = {
        ...validRequest,
        origin: {
          ...validRequest.origin,
          state: 'INVALID' // Should be 2 chars
        }
      };

      await expect(
        service.getRates('TestCarrier', invalidRequest as RateRequest)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getAllRates', () => {
    it('should get rates from all carriers', async () => {
      const carrier2: ICarrier = {
        name: 'Carrier2',
        getRates: jest.fn().mockResolvedValue([
          {
            carrier: 'Carrier2',
            service: 'EXPRESS',
            serviceName: 'Express',
            totalCost: 25.00,
            currency: 'USD'
          }
        ])
      };

      mockCarrier.getRates.mockResolvedValue([
        {
          carrier: 'TestCarrier',
          service: 'GROUND',
          serviceName: 'Ground',
          totalCost: 15.00,
          currency: 'USD'
        }
      ]);

      service.registerCarrier(mockCarrier);
      service.registerCarrier(carrier2);

      const quotes = await service.getAllRates(validRequest);

      expect(quotes).toHaveLength(2);
      expect(mockCarrier.getRates).toHaveBeenCalled();
      expect(carrier2.getRates).toHaveBeenCalled();
    });

    it('should continue if one carrier fails', async () => {
      const carrier2: ICarrier = {
        name: 'Carrier2',
        getRates: jest.fn().mockResolvedValue([
          {
            carrier: 'Carrier2',
            service: 'EXPRESS',
            serviceName: 'Express',
            totalCost: 25.00,
            currency: 'USD'
          }
        ])
      };

      mockCarrier.getRates.mockRejectedValue(new Error('Carrier failed'));

      service.registerCarrier(mockCarrier);
      service.registerCarrier(carrier2);

      const quotes = await service.getAllRates(validRequest);

      // Should only have quotes from carrier2
      expect(quotes).toHaveLength(1);
      expect(quotes[0].carrier).toBe('Carrier2');
    });

    it('should validate request before calling carriers', async () => {
      service.registerCarrier(mockCarrier);

      const invalidRequest = {
        ...validRequest,
        packages: []
      };

      await expect(
        service.getAllRates(invalidRequest as RateRequest)
      ).rejects.toThrow(ValidationError);

      expect(mockCarrier.getRates).not.toHaveBeenCalled();
    });
  });
});
