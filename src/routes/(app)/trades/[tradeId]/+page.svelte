<script lang="ts">
  import { Button } from "#lib/components/ui/button/index.js";
  import { Label } from "#lib/components/ui/label/index.js";
  import { Switch } from "#lib/components/ui/switch/index.js";
  import CopyRef from "../../../../lib/components/workstation/CopyRef.svelte";
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";
  import Chip from "#lib/components/marketing/Chip.svelte";
  import Pillar from "#lib/components/workstation/Pillar.svelte";
  import BuyerPanel from "#lib/components/workstation/BuyerPanel.svelte";
  import OffersTable from "#lib/components/workstation/OffersTable.svelte";
  import SelectedOffer from "#lib/components/workstation/SelectedOffer.svelte";
  import BridgeLedger from "#lib/components/workstation/BridgeLedger.svelte";
  import FeePanel from "#lib/components/workstation/FeePanel.svelte";
  import AddOfferDialog from "#lib/components/workstation/AddOfferDialog.svelte";
  import { Workstation } from "#lib/workstation.svelte.js";
  import {
    toStatus,
    humanize,
    warningText,
    type Status,
  } from "#lib/api/schemas.js";
  import { usd, signed, dateRange } from "#lib/format.js";

  let { data } = $props();

  const ws = new Workstation(() => data);

  let adding = $state(false);

  const sel = $derived(ws.selected),
    o = $derived(sel?.offer),
    ev = $derived(sel?.ev),
    buyer = $derived(ws.opp.buyer);

  const cov = $derived(ws.selectedCoverage),
    pool = $derived(ws.agreement?.totalPoolUsdPerMt);

  const room = $derived(ev?.roomUsdPerMt);
  const tone = (s?: string | null): Status => toStatus(s);
  const m = (s: string) => (ws.presentation ? "••••" : s);
</script>

<svelte:head
  ><title>{ws.opp.referenceNumber} · TradeEnvelope</title></svelte:head
>

<div class="mx-auto max-w-[1700px] space-y-3">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="flex items-center gap-2">
      <a
        href="/trades"
        class="text-sm text-muted-foreground hover:text-foreground">Blotter</a
      >
      <CopyRef value={ws.opp.referenceNumber} />
      {#if ev}<Chip kind="viable">EVALUATED</Chip>{:else}<Chip kind="tight"
          >NOT EVALUATED</Chip
        >{/if}
      {#if ws.busy}<span
          class="flex items-center gap-1 text-xs text-muted-foreground"
          role="status"
          ><LoaderCircle
            class="size-3.5 animate-spin"
            aria-hidden="true"
          />Working…</span
        >{/if}
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        class="h-7"
        disabled={ws.busy}
        onclick={() => ws.run()}>Re-evaluate</Button
      >
      <Label
        class="flex items-center gap-2 rounded border bg-card px-2 py-1 text-xs"
        ><Switch bind:checked={ws.presentation} />Presentation mode {ws.presentation
          ? "on"
          : "off"}</Label
      >
      <Button
        size="sm"
        variant="outline"
        class="h-7"
        disabled
        title="Not available in the API yet"
        >Sanitized teaser <span class="ml-1 font-mono text-[9px]">SOON</span
        ></Button
      >
      <Button
        size="sm"
        variant="outline"
        class="h-7"
        disabled
        title="Not available in the API yet"
        >Deal audit <span class="ml-1 font-mono text-[9px]">SOON</span></Button
      >
    </div>
  </div>
  {#if ws.error && !adding}
    <p
      class="whitespace-pre-line rounded border border-doa-bd bg-doa-bg p-2 text-xs text-doa"
      role="alert"
    >
      {ws.error}
    </p>
  {/if}

  <div
    class="grid gap-3 transition-opacity duration-150 md:grid-cols-3 {ws.busy
      ? 'opacity-60'
      : ''}"
    aria-busy={ws.busy}
    aria-label="Deal status"
  >
    <Pillar
      title="Commercial room · Tier 1"
      tone={tone(ev?.viabilityStatus)}
      value={room != null ? `${signed(room)} / MT` : "–"}
      chips={[
        ...(ev?.isAssumed ? [{ kind: "tight" as const, text: "ASSUMED" }] : []),
        ...(ev?.viabilityStatus
          ? [
              {
                kind: tone(ev.viabilityStatus),
                text: humanize(ev.viabilityStatus),
              },
            ]
          : []),
      ]}
      left={ev?.totalRoom && ev.quantityMt
        ? `Gross: ${usd(ev.totalRoom.amount, 0)} (${ev.quantityMt.toLocaleString()} MT)`
        : ""}
      right="Threshold: {usd(ws.opp.viabilityThresholdUsdPerMt)}/MT"
    />
    <Pillar
      title="Schedule & arrival fit"
      tone={tone(ev?.schedule)}
      value={o ? `Laycan ${dateRange(o.laycanStart, o.laycanEnd)}` : "–"}
      sub={buyer
        ? `window ${dateRange(buyer.arrivalWindowStart, buyer.arrivalWindowEnd)}`
        : ""}
      chips={ev
        ? [{ kind: tone(ev.schedule), text: humanize(ev.schedule) }]
        : []}
      note={ev?.warnings[0] ? warningText(ev.warnings[0]) : undefined}
      right={o ? `${o.transitDays}d transit` : ""}
    />
    <Pillar
      title="Tier 2 fee coverage"
      tone={tone(cov?.status)}
      value={cov?.coverageRatio != null
        ? `${cov.coverageRatio.toFixed(2)}×`
        : ws.agreement
          ? "–"
          : "No agreement"}
      sub={cov?.coverageRatio != null ? "coverage" : ""}
      chips={cov
        ? [{ kind: tone(cov.status), text: humanize(cov.status) }]
        : []}
      left={pool != null ? `Fee pool: ${m(usd(pool))} / MT` : ""}
      right={cov?.shortfallUsdPerMt
        ? `Shortfall ${m(usd(cov.shortfallUsdPerMt))}/MT`
        : ""}
    />
  </div>

  <div
    class="grid items-start gap-3 transition-opacity duration-150 lg:grid-cols-[300px_minmax(0,1fr)_360px] min-[1440px]:grid-cols-[340px_minmax(0,1fr)_400px]{ws.busy
      ? 'opacity-60'
      : ''}"
    aria-busy={ws.busy}
  >
    <BuyerPanel {ws} />
    <div class="min-w-0 space-y-3">
      <section
        class="rounded border bg-card"
        aria-label="Ranked multi-offer comparison"
      >
        <div class="flex h-10 items-center justify-between px-3">
          <h2 class="text-sm font-semibold">Ranked multi-offer comparison</h2>
          <span class="flex items-center gap-3"
            ><span class="num text-xs text-muted-foreground"
              >{ws.rows.length} candidates</span
            ><Button
              size="sm"
              variant="outline"
              class="h-6 px-2 text-xs text-primary"
              disabled={!buyer}
              title={buyer ? "" : "Set the buyer requirement first"}
              onclick={() => (adding = true)}>+ New offer</Button
            ></span
          >
        </div>
        <OffersTable {ws} />
      </section>
      <SelectedOffer {ws} />
      <BridgeLedger {ws} />
    </div>
    <div class="min-[1440px]:col-span-1"><FeePanel {ws} /></div>
  </div>
</div>
<AddOfferDialog {ws} bind:open={adding} />
