import { z } from "zod";
import { AddOfferRequest, Incoterm, Product } from "#lib/api/schemas.js";

export const AddOfferForm = z
  .object({
    supplierName: z.string().trim().min(1, "Required"),
    terminal: z.string().trim().min(1, "Required"),
    place: z.string().trim().min(1, "Required"),
    incoterm: Incoterm.default("Fob"),
    qty: z.number().positive("Must be greater than 0"),
    density: z
      .number()
      .min(0.6, "Density looks wrong (kg/L)")
      .max(1.1, "Density looks wrong (kg/L)")
      .default(0.845),
    price: z.number().positive("Must be greater than 0"),
    freight: z.number().min(0, "Must be 0 or more").optional(),
    loss: z.number().min(0, "Must be 0 or more").default(0),
    transit: z
      .number()
      .int("Whole days only")
      .min(0, "Must be 0 or more")
      .default(0),
    laycanStart: z.string().min(1, "Required"),
    laycanEnd: z.string().min(1, "Required"),
  })
  .refine((v) => v.incoterm !== "Fob" || v.freight !== undefined, {
    path: ["freight"],
    message: "Required for FOB offers",
  })
  .refine(
    (v) => !v.laycanStart || !v.laycanEnd || v.laycanEnd >= v.laycanStart,
    { path: ["laycanEnd"], message: "Laycan end is before start" },
  );
export type AddOffer = z.infer<typeof AddOfferForm>;

/** Pure field mapping to the API body (no calculations). Product is always the buyer's. */
export const toAddOfferRequest = (v: AddOffer, product: z.infer<typeof Product>) =>
  AddOfferRequest.parse({
    supplierName: v.supplierName,
    product,
    quantityAmount: v.qty,
    quantityUnit: "MetricTon",
    densityKgPerLitre: v.density,
    offerPrice: {
      currency: "USD",
      unit: "MetricTon",
      incoterm: v.incoterm,
      namedPlace: v.place,
      flatAmount: v.price,
    },
    loadingTerminal: v.terminal,
    laycanStart: v.laycanStart,
    laycanEnd: v.laycanEnd,
    transitLossPercent: v.loss,
    transitDays: v.transit,
  });
