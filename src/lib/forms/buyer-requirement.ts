import { z } from "zod";
import {
  Product,
  Incoterm,
  Settlement,
  BuyerRequirementRequest,
  type TradeOpportunity,
} from "#lib/api/schemas.js";

export const BuyerForm = z
  .object({
    product: Product.default("Ago"),
    quantityMt: z.number().positive("Must be greater than 0"),
    tolerancePercent: z
      .number()
      .min(0, "Must be 0 or more")
      .max(100, "Max 100")
      .default(0),
    thresholdUsdPerMt: z.number().min(0, "Must be 0 or more").default(2), // API default is $2.00
    ceilingUsdPerMt: z.number().positive("Must be greater than 0"),
    ceilingIncoterm: Incoterm.default("Cif"),
    namedPlace: z.string().trim().min(1, "Required"),
    settlement: Settlement.default("BillOfLading"),
    arrivalWindowStart: z.string().min(1, "Required"),
    arrivalWindowEnd: z.string().min(1, "Required"),
    destinationCosts: z
      .array(
        z.object({
          name: z.string().trim().min(1, "Required"),
          category: z.string().trim().min(1, "Required"),
          amountPerMtUsd: z.number().min(0, "Must be 0 or more"),
        }),
      )
      .default([]),
  })
  .refine(
    (v) =>
      !v.arrivalWindowStart ||
      !v.arrivalWindowEnd ||
      v.arrivalWindowEnd >= v.arrivalWindowStart,
    { path: ["arrivalWindowEnd"], message: "Window end is before start" },
  );
export type BuyerFormData = z.infer<typeof BuyerForm>;

export const toBuyerRequest = (v: BuyerFormData) =>
  BuyerRequirementRequest.parse({
    product: v.product,
    quantityMt: v.quantityMt,
    tolerancePercent: v.tolerancePercent,
    priceCeiling: {
      currency: "USD",
      unit: "MetricTon",
      incoterm: v.ceilingIncoterm,
      namedPlace: v.namedPlace,
      flatAmount: v.ceilingUsdPerMt,
    },
    arrivalWindowStart: v.arrivalWindowStart,
    arrivalWindowEnd: v.arrivalWindowEnd,
    settlement: v.settlement,
  });

export const buyerDefaults = (o: TradeOpportunity): Partial<BuyerFormData> => {
  const b = o.buyer;
  return {
    thresholdUsdPerMt: o.viabilityThresholdUsdPerMt,
    destinationCosts: o.destinationCosts.map((c) => ({
      name: c.name,
      category: c.category,
      amountPerMtUsd: c.amountPerMtUsd,
    })),
    ...(b
      ? {
          product: b.product,
          quantityMt: b.quantityMt,
          tolerancePercent: b.tolerancePercent,
          ceilingUsdPerMt: b.priceCeiling.flatAmount ?? 0,
          ceilingIncoterm: b.priceCeiling.incoterm,
          namedPlace: b.priceCeiling.namedPlace,
          settlement: Settlement.catch("BillOfLading").parse(b.settlement),
          arrivalWindowStart: b.arrivalWindowStart,
          arrivalWindowEnd: b.arrivalWindowEnd,
        }
      : {}),
  };
};
