import { z } from 'zod';

// Address schema - used across all carriers
export const AddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  postalCode: z.string().min(5),
  country: z.string().length(2).default('US')
});

export type Address = z.infer<typeof AddressSchema>;

// Package dimensions and weight
export const PackageSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  weight: z.number().positive(),
  dimensionUnit: z.enum(['IN', 'CM']).default('IN'),
  weightUnit: z.enum(['LBS', 'KG']).default('LBS')
});

export type Package = z.infer<typeof PackageSchema>;

// Rate request - what the caller sends us
export const RateRequestSchema = z.object({
  origin: AddressSchema,
  destination: AddressSchema,
  packages: z.array(PackageSchema).min(1),
  serviceLevel: z.string().optional() // e.g., 'GROUND', 'NEXT_DAY_AIR'
});

export type RateRequest = z.infer<typeof RateRequestSchema>;

// Rate quote - what we return to the caller
export const RateQuoteSchema = z.object({
  carrier: z.string(),
  service: z.string(),
  serviceName: z.string(),
  totalCost: z.number(),
  currency: z.string(),
  deliveryDays: z.number().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type RateQuote = z.infer<typeof RateQuoteSchema>;
