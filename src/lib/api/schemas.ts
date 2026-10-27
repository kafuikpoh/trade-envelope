import { z } from "zod";

/* Enums confirmed by v1.json */
export const Incoterm = z.enum(["Fob", "Cfr", "Cif", "Dap"]);
export const Unit = z.enum(["MetricTon", "Barrel"]);
export const Product = z.enum(["Ago", "Pms", "JetA1"]);
export const InsuranceMode = z.enum(["PercentOfValue", "FlatPerMt"]);
export const Anchor = z.enum(["BillOfLading", "Arrival", "CalendarMonth"]);
export const Settlement = z.enum(["BillOfLading", "Outturn"]);

const date = z.string(); // DateOnly -> "YYYY-MM-DD"
const opt = <T extends z.ZodTypeAny>(s: T) => s.nullish();

/* ---------- Responses (from the .NET classes) ---------- */
export const PriceBasis = z.object({
  kind: z.string(),
  currency: z.string(),
  unit: Unit,
  incoterm: Incoterm,
  namedPlace: z.string(),
  flatAmount: opt(z.number()),
  indexReference: opt(z.string()),
  differential: opt(z.number()),
  anchor: opt(Anchor),
  daysBefore: opt(z.number()),
  daysAfter: opt(z.number()),
  assumedBaseLevel: opt(z.number()),
  assumedBaseAsOf: opt(date),
});
export const CostComponent = z.object({
  name: z.string(),
  category: z.string(),
  amountPerMtUsd: z.number(),
});
export const BuyerRequirement = z.object({
  product: Product,
  quantityMt: z.number(),
  tolerancePercent: z.number(),
  priceCeiling: PriceBasis,
  arrivalWindowStart: date,
  arrivalWindowEnd: date,
  settlement: z.string(),
});
export const SupplierOffer = z.object({
  id: z.string(),
  supplierName: z.string(),
  product: Product,
  quantityAmount: z.number(),
  quantityUnit: Unit,
  quantityMt: z.number(),
  densityKgPerLitre: z.number(),
  offerPrice: PriceBasis,
  loadingTerminal: z.string(),
  laycanStart: date,
  laycanEnd: date,
  estimatedBlDate: date,
  insuranceMode: InsuranceMode,
  insuranceRatePercent: z.number(),
  insuranceCoveragePercent: z.number(),
  insuranceFlatUsdPerMt: z.number(),
  transitLossPercent: z.number(),
  transitDays: z.number(),
  isWithdrawn: z.boolean(),
  routeCosts: z.array(CostComponent).default([]),
});
export const TradeOpportunity = z.object({
  id: z.string(),
  referenceNumber: z.string(),
  viabilityThresholdUsdPerMt: z.number(),
  buyer: opt(BuyerRequirement),
  destinationCosts: z.array(CostComponent).default([]),
  offers: z.array(SupplierOffer).default([]),
});
export const TradeOpportunitySummary = z.object({
  id: z.string(),
  referenceNumber: z.string(),
  viabilityThresholdUsdPerMt: z.number(),
  hasBuyerRequirement: z.boolean(),
  activeOfferCount: z.number(),
  totalOfferCount: z.number(),
});
export const paged = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number(),
    pageSize: z.number(),
    totalCount: z.number(),
  });

export const PriceBridge = z.object({
  targetIncoterm: Incoterm,
  supplierPriceUsdPerMt: z.number(),
  oceanFreightUsdPerMt: z.number(),
  marineInsuranceUsdPerMt: z.number(),
  destinationCostsUsdPerMt: z.number(),
  transitLossUsdPerMt: z.number(),
  otherCostsUsdPerMt: z.number(),
  normalizedUsdPerMt: z.number(),
});
// ASSUMED (not supplied yet): MoneyResponse and EvaluationWarning shapes.
// Kept permissive so parsing never fails; tighten once the real definitions are known.
export const Money = z
  .object({ amount: z.number(), currency: z.string() })
  .passthrough();
export const EvaluationWarning = z.union([
  z.string(),
  z
    .object({ code: z.string().optional(), message: z.string().optional() })
    .passthrough(),
]);
export const OfferEvaluation = z.object({
  offerId: z.string(),
  supplierName: z.string(),
  rank: z.number(),
  method: z.string(),
  bridge: opt(PriceBridge),
  roomUsdPerMt: opt(z.number()),
  quantityMt: opt(z.number()),
  totalRoom: opt(Money),
  viabilityStatus: opt(z.enum(["Viable", "TightMargin", "DeadOnArrival"])),
  viabilityReason: opt(z.string()),
  isAssumed: z.boolean(),
  breakEvenIndexLevel: opt(z.number()),
  schedule: z.enum(["Fits", "PartialOverlap", "Incompatible"]),
  warnings: z.array(EvaluationWarning).default([]),
});
export const Evaluation = z.array(OfferEvaluation); // ASSUMED: evaluate returns an array
// Fee payloads are ASSUMED (not yet supplied) and deliberately lenient; a mismatch hides the fee panel instead of breaking the page.
export const Entitlement = z
  .object({
    id: z.string(),
    side: z.string(),
    participantName: z.string(),
    rateUsdPerMt: z.number(),
    isSelf: z.boolean().default(false),
    status: z.string().optional(),
  })
  .passthrough();
export const FeeAgreement = z
  .object({
    id: z.string(),
    totalPoolUsdPerMt: z.number().optional(),
    buyerSideUsdPerMt: z.number().optional(),
    sellerSideUsdPerMt: z.number().optional(),
    entitlements: z.array(Entitlement).default([]),
  })
  .passthrough();
export const CoverageItem = z
  .object({
    offerId: z.string(),
    status: z.string(),
    coverageRatio: z.number().optional(),
    shortfallUsdPerMt: z.number().optional(),
  })
  .passthrough();
export const Coverage = z
  .union([
    z.array(CoverageItem),
    z.object({ offers: z.array(CoverageItem) }).passthrough(),
  ])
  .transform((v) => (Array.isArray(v) ? v : v.offers));
export const Reconcile = z
  .object({
    isBalanced: z.boolean().optional(),
    buyerSideUnallocatedUsdPerMt: z.number().optional(),
    sellerSideUnallocatedUsdPerMt: z.number().optional(),
    offers: z
      .array(
        z
          .object({
            offerId: z.string(),
            estimatedPoolPayout: z.number().optional(),
            estimatedTakeHome: z.number().optional(),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();

/* ---------- Requests (validated before sending) ---------- */
export const PriceBasisRequest = z.object({
  currency: z.string().min(1),
  unit: Unit,
  incoterm: Incoterm,
  namedPlace: z.string().min(1),
  flatAmount: z.number().nullable(),
  indexed: z.undefined().optional(), // omit for flat prices
});
export const AddOfferRequest = z
  .object({
    supplierName: z.string().min(1, "Supplier is required"),
    product: Product,
    quantityAmount: z.number().positive(),
    quantityUnit: Unit,
    densityKgPerLitre: z
      .number()
      .min(0.6)
      .max(1.1, "Density looks wrong (kg/L)"),
    offerPrice: PriceBasisRequest,
    loadingTerminal: z.string().min(1),
    laycanStart: date.min(1, "Laycan start is required"),
    laycanEnd: date.min(1, "Laycan end is required"),
    transitLossPercent: z.number().min(0),
    transitDays: z.number().int().min(0),
  })
  .refine((v) => v.laycanEnd >= v.laycanStart, {
    message: "Laycan end is before start",
    path: ["laycanEnd"],
  });

export type Incoterm = z.infer<typeof Incoterm>;
export type TradeOpportunity = z.infer<typeof TradeOpportunity>;
export type SupplierOffer = z.infer<typeof SupplierOffer>;
export type OfferEvaluation = z.infer<typeof OfferEvaluation>;
export type FeeAgreement = z.infer<typeof FeeAgreement>;
export type CoverageItem = z.infer<typeof CoverageItem>;
export type Reconcile = z.infer<typeof Reconcile>;
export type Status = "viable" | "tight" | "doa";

/** Exact backend enums -> UI colour. Unknown values fall back to amber. */
const STATUS: Record<string, Status> = {
  Viable: "viable",
  TightMargin: "tight",
  DeadOnArrival: "doa",
  Fits: "viable",
  PartialOverlap: "tight",
  Incompatible: "doa",
  Covered: "viable",
  PartiallyCovered: "tight",
  Uncovered: "doa",
  NotAssessed: "tight",
};
export const toStatus = (s?: string | null): Status =>
  (s && STATUS[s]) || "tight";
export const humanize = (s: string) =>
  s.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toUpperCase();

export const warningText = (w: z.infer<typeof EvaluationWarning>) =>
  typeof w === "string" ? w : (w.message ?? w.code ?? "Warning");

/* ---------- Setup-flow requests (per the API walkthrough) ---------- */
export const CreateOpportunityRequest = z.object({
  referenceNumber: z.string().min(1),
  viabilityThresholdUsdPerMt: z.number().min(0).optional(),
});
export const BuyerRequirementRequest = z.object({
  product: Product,
  quantityMt: z.number().positive(),
  tolerancePercent: z.number().min(0),
  priceCeiling: PriceBasisRequest,
  arrivalWindowStart: date,
  arrivalWindowEnd: date,
  settlement: Settlement,
});
export const CostRequest = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  amountPerMtUsd: z.number().min(0),
});
export const ThresholdRequest = z.object({
  thresholdUsdPerMt: z.number().min(0),
});
export const EntitlementRequest = z.object({
  side: z.enum(["Buyer", "Seller"]),
  participantName: z.string().trim().min(1, "Required"),
  rateUsdPerMt: z.number().positive("Must be greater than 0"),
  isSelf: z.boolean().default(false),
});
