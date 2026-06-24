import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { SuitableFor } from '../../common/enums/suitable-for.enum';
import { Finishing } from '../../common/enums/finishing.enum';

export const localizedTextSchema = z
  .object({
    nl: z.string().optional(),
    en: z.string().optional(),
    de: z.string().optional(),
  })
  .refine((val) => val.nl || val.en || val.de, {
    message: 'At least one language (nl, en, de) is required',
  });

export const CreateProductSchema = z.object({
  name: localizedTextSchema,
  description: localizedTextSchema.nullable().optional(),
  status: z.enum(ProductStatus).optional(),
  categoryId: z.number().int().min(1).optional(),

  // internal / stock
  stock: z.number().nullable().optional(),
  backorder: z.boolean().optional(),
  countryRestriction: z.array(z.string()).nullable().optional(),
  endDate: z.string().nullable().optional(),
  certificates: z.record(z.string(), z.string()).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),

  // measurements
  capacity: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
  depth: z.number().nullable().optional(),
  weight: z.number().nullable().optional(),
  length: z.number().nullable().optional(),
  thickness: z.number().nullable().optional(),

  // extended attributes
  co2EmissionProduction: z.string().nullable().optional(),
  co2EmissionTransport: z.string().nullable().optional(),
  suitableFor: z.enum(SuitableFor).nullable().optional(),
  color: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  application: z.string().nullable().optional(),
  countryOfOrigin: z.string().nullable().optional(),
  finishing: z.enum(Finishing).nullable().optional(),
  douProduct: z.boolean().nullable().optional(),
  biodegradable: z.boolean().nullable().optional(),
  handmade: z.boolean().nullable().optional(),
  scratchProne: z.boolean().nullable().optional(),
  customizable: z.record(z.string(), z.unknown()).nullable().optional(),
  accessories: z.array(z.unknown()).nullable().optional(),
  ringSizing: z.record(z.string(), z.unknown()).nullable().optional(),
  typeOfClosure: z.string().nullable().optional(),
  gemstoneType: z.string().nullable().optional(),

  pimTemplate: z.record(z.string(), z.unknown()).nullable().optional(),
});

export class CreateProductDto extends createZodDto(CreateProductSchema) {}
