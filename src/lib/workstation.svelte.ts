import { refreshAll } from "$app/navigation";
import { toast } from "svelte-sonner";
import { call } from "#lib/api/client.js";
import type {
  TradeOpportunity,
  OfferEvaluation,
  SupplierOffer,
  FeeAgreement,
  CoverageItem,
  Reconcile,
  Status,
} from "#lib/api/schemas.js";
export type { Status };

export interface WorkstationData {
  opportunity: TradeOpportunity;
  evaluations: OfferEvaluation[];
  agreement: FeeAgreement | null;
  coverage: CoverageItem[];
  reconcile: Reconcile | null;
}
export interface Row {
  offer: SupplierOffer;
  ev: OfferEvaluation | null;
}

/** View state only. Pricing, ranking, viability and coverage all come from the .NET API. */
export class Workstation {
  presentation = $state(false);
  selectedId = $state("");
  busy = $state(false);
  error = $state("");

  // Declare the property before the derived fields.
  data: () => WorkstationData;

  constructor(data: () => WorkstationData) {
    this.data = data;
  }

  opp = $derived(this.data().opportunity);
  agreement = $derived(this.data().agreement);
  reconcile = $derived(this.data().reconcile);

  rows = $derived.by<Row[]>(() => {
    const ev = new Map(this.data().evaluations.map((e) => [e.offerId, e]));
    const key = (r: Row) =>
      r.offer.isWithdrawn ? 1e9 : r.ev && r.ev.rank > 0 ? r.ev.rank : 1e8;
    return this.opp.offers
      .map((offer) => ({ offer, ev: ev.get(offer.id) ?? null }))
      .sort((a, b) => key(a) - key(b));
  });
  selected = $derived(
    this.rows.find((r) => r.offer.id === this.selectedId) ?? this.rows[0],
  );

  selectedCoverage = $derived(
    this.data().coverage.find((c) => c.offerId === this.selected?.offer.id) ??
      null,
  );
  selectedReconcile = $derived(
    this.reconcile?.offers.find((o) => o.offerId === this.selected?.offer.id) ??
      null,
  );

  /** Optionally apply a change, then reload (the page load re-runs POST /evaluate). */
  async run(
    work?:
      | { method: string; path: string; body?: unknown; success?: string }
      | (() => Promise<unknown>),
    success?: string,
  ) {
    this.busy = true;
    this.error = "";
    try {
      if (typeof work === "function") await work();
      else if (work) await call(work.method, work.path, work.body);
      await refreshAll();
    } catch (e) {
      this.error = e instanceof Error ? e.message : "Request failed";
    } finally {
      this.busy = false;
    }

    const msg = success ?? (work && typeof work !== "function" ? work.success : undefined);

    if(!this.error && msg) toast.success(msg);
  }
}
