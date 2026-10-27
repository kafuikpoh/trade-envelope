<script lang="ts">
  import Pricing from "#lib/components/marketing/Pricing.svelte";
  import Chip from "#lib/components/marketing/Chip.svelte";
  import Button from "#lib/components/ui/button/button.svelte";
  import * as Card from "#lib/components/ui/card/index.ts";
  import Scratchpad from "../../lib/components/marketing/Scratchpad.svelte";

  const traps = [
    {
      t: "The landed cost illusion",
      err: "Deducting destination port dues and inspection fees from a CIF buyer’s ceiling.",
      real: "A CIF buyer pays destination dues after the flange. Deducting them kills profitable trades before negotiation starts.",
      fix: "Incoterms 2020 parity. Prices normalize to the buyer’s delivery boundary with no phantom deductions.",
    },
    {
      t: "Volumetric drift",
      err: "Using one conversion factor (such as 7.5 bbl/MT) across temperatures and grades.",
      real: "AGO density moves from 0.820 to 0.845 kg/L. A 0.01 swing on 30,000 MT is a $15,000+ margin error.",
      fix: "ASTM density normalization at 15°C. Mass and volume update on every keystroke.",
    },
    {
      t: "The rigid fee-pool impasse",
      err: "Forcing a “$10/MT split 50/50” template onto every deal.",
      real: "When a deal has $7/MT of real room, demanding a $10 pool makes the principal walk away.",
      fix: "Two-tier viability separates cargo economics from fee coverage, with a one-click Fit to Room.",
    },
  ];
  const features = [
    {
      t: "3-pillar deal HUD",
      d: "Trade room (viable or DOA), schedule fit (laycan vs ETA), and fee coverage (funded or choked), scored instantly.",
    },
    {
      t: "Price bridge ledger",
      d: "FOB to CFR to CIF with exact 110% marine insurance and optional transit-loss deductibles.",
    },
    {
      t: "Ranked multi-offer table",
      d: "Four supplier quotes against one buyer, ranked by CIF parity, with sulfur PPM and transit flags.",
    },
    {
      t: "Presentation mode and PDFs",
      d: "Mask broker fees live, then export a sanitized Teaser or a full Internal Audit.",
    },
  ];
</script>

<svelte:head
  ><title>TradeEnvelope: refined products trade and brokerage analyzer</title
  ></svelte:head
>

<section class="mx-auto max-w-6xl px-3 pt-12">
  <Chip kind="desk">COMMERCIAL ARBITRAGE AND BROKERAGE DESK WORKSTATION</Chip>
  <h1
    class="mt-3 max-w-3xl text-[1.5rem] font-semibold leading-8 tracking-[-0.02em] md:text-[2.25rem] md:leading-[2.75rem]"
  >
    Know the trade. Know the room. Know your fee.
  </h1>
  <p class="mt-3 max-w-2xl text-sm text-muted-foreground">
    Stop losing physical fuel deals to spreadsheet errors, mismatched Incoterms,
    and commission disputes. TradeEnvelope normalizes FOB and CIF terms, audits
    logistics costs, and stress-tests fee splits in under 30 seconds.
  </p>
  <div class="mt-4 flex gap-2">
    <Button href="/register">Start 14-day trial</Button>
    <Button href="#scratchpad" variant="outline">See an example deal</Button>
  </div>
  <p class="mt-2 text-xs text-muted-foreground">
    Built for independent brokers and trading desks handling AGO, PMS, and Jet
    A-1.
  </p>
  <div id="scratchpad" class="mt-8 scroll-mt-16"><Scratchpad /></div>
</section>

<section id="traps" class="mx-auto mt-16 max-w-6xl scroll-mt-16 px-3">
  <h2 class="text-xl font-semibold tracking-tight">
    Three spreadsheet errors that cost brokers deals
  </h2>
  <div class="mt-3 grid gap-3 md:grid-cols-3">
    {#each traps as t}
      <Card.Root class="rounded shadow-none">
        <Card.Header class="border-b p-3"
          ><Card.Title class="text-sm">{t.t}</Card.Title></Card.Header
        >
        <Card.Content class="space-y-2 p-3 text-sm">
          <p>
            <Chip kind="doa">ERROR</Chip>
            <span class="text-muted-foreground">{t.err}</span>
          </p>
          <p><span class="font-medium">Reality.</span> {t.real}</p>
          <p><Chip kind="viable">FIX</Chip> {t.fix}</p>
        </Card.Content>
      </Card.Root>
    {/each}
  </div>
</section>

<section id="features" class="mx-auto mt-16 max-w-6xl scroll-mt-16 px-3">
  <h2 class="text-xl font-semibold tracking-tight">
    What the workstation does
  </h2>
  <dl
    class="mt-3 grid gap-px overflow-hidden rounded border bg-border md:grid-cols-2"
  >
    {#each features as f}<div class="bg-card p-3">
        <dt class="text-sm font-semibold">{f.t}</dt>
        <dd class="mt-1 text-sm text-muted-foreground">{f.d}</dd>
      </div>{/each}
  </dl>
</section>

<section class="mx-auto mt-16 max-w-6xl px-3">
  <h2 class="text-xl font-semibold tracking-tight">
    Zero-data broker privacy charter
  </h2>
  <ul class="mt-3 grid gap-3 text-sm md:grid-cols-3">
    <li class="rounded border bg-card p-3">
      <b>No deal sniffing.</b> We don’t trade, broker, finance, or clear physical
      energy. We are a calculation engine.
    </li>
    <li class="rounded border bg-card p-3">
      <b>Counterparty anonymity.</b> Model deals as “Buyer A” or “STS Lomé Supplier”.
      Legal names are never required.
    </li>
    <li class="rounded border bg-card p-3">
      <b>Private workspace.</b> Margins, fee splits, and pricing stay on your desk
      and are never aggregated or sold.
    </li>
  </ul>
</section>

<section class="mx-auto mt-16 max-w-6xl px-3">
  <h2 class="mb-3 text-xl font-semibold tracking-tight">Desk pricing</h2>
  <Pricing />
</section>
