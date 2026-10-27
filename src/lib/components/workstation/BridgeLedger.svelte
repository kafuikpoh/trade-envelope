<script lang="ts">
  import { flash } from "#lib/actions/flash.ts";
  import Chip from "#lib/components/marketing/Chip.svelte";
  import { toStatus } from "#lib/api/schemas.js";
  import { usd, signed } from "#lib/format.js";
  import type { Workstation } from "#lib/workstation.svelte.js";

  let { ws }: { ws: Workstation } = $props();

  const o = $derived(ws.selected?.offer),
    ev = $derived(ws.selected?.ev),
    b = $derived(ev?.bridge),
    buyer = $derived(ws.opp.buyer);

  const ins = $derived(
    o
      ? o.insuranceMode === "FlatPerMt"
        ? `flat ${usd(o.insuranceFlatUsdPerMt)}/MT`
        : `${o.insuranceRatePercent}% of ${o.insuranceCoveragePercent}% value`
      : "",
  );

  const lines = $derived(
    b && o
      ? ([
          [
            `Base supplier ${o.offerPrice.incoterm.toUpperCase()}`,
            b.supplierPriceUsdPerMt,
          ],
          ["+ Ocean freight", b.oceanFreightUsdPerMt],
          [`+ Marine cargo insurance (${ins})`, b.marineInsuranceUsdPerMt],
          ...(b.destinationCostsUsdPerMt
            ? [["+ Destination costs", b.destinationCostsUsdPerMt]]
            : []),
          [
            `+ Ocean transit loss (${o.transitLossPercent}%)`,
            b.transitLossUsdPerMt,
          ],
          ...(b.otherCostsUsdPerMt
            ? [["+ Other costs", b.otherCostsUsdPerMt]]
            : []),
        ] as [string, number][])
      : [],
  );
</script>

<section class="rounded border bg-card" aria-label="Price bridge ledger">
  <div class="flex h-9 items-center justify-between border-b px-3">
    <h2 class="col-head">Dynamic price bridge ledger</h2>
    <span class="text-xs text-muted-foreground">Normalized to buyer terms</span>
  </div>
  {#if b}
    <dl class="text-sm">
      {#each lines as [k, v]}<div
          class="flex h-7 items-center justify-between border-b px-3"
        >
          <dt>{k}</dt>
          <dd class="num">{usd(v)} / MT</dd>
        </div>{/each}
      <div
        class="flex h-8 items-center justify-between border-b bg-accent px-3 font-semibold text-primary"
      >
        <dt>= Normalized delivered {b.targetIncoterm.toUpperCase()} parity</dt>
        <dd class="num" use:flash={b.normalizedUsdPerMt}>
          {usd(b.normalizedUsdPerMt)} / MT</dd>
      </div>
    </dl>
    {#if buyer && ev}
      <div
        class="m-3 flex flex-wrap items-center justify-between gap-2 rounded border border-viable-bd bg-viable-bg p-2 text-sm"
      >
        <span
          >Buyer target ceiling: <b class="num"
            >{buyer.priceCeiling.flatAmount != null
              ? usd(buyer.priceCeiling.flatAmount)
              : buyer.priceCeiling.indexReference} / MT</b
          ></span
        >
        {#if ev.roomUsdPerMt != null}<Chip kind={toStatus(ev.viabilityStatus)}
            >COMMERCIAL ROOM {signed(ev.roomUsdPerMt)} / MT</Chip
          >{/if}
      </div>
    {/if}
    {#if ev?.breakEvenIndexLevel != null}<p
        class="num mx-3 mb-3 rounded border bg-background p-2 text-xs text-muted-foreground"
      >
        Break-even index level: room exists while the index stays below {usd(
          ev.breakEvenIndexLevel,
        )} / MT
      </p>{/if}
    {#if ev?.viabilityReason}<p class="mx-3 mb-3 text-xs text-muted-foreground">
        {ev.viabilityReason}
      </p>{/if}
  {:else}<p class="p-3 text-sm text-muted-foreground">
      {ev?.viabilityReason ??
        "Not evaluated. Add a buyer requirement and an active offer."}
    </p>{/if}
</section>
