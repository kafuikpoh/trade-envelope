<script lang="ts">
  import { Button } from "#lib/components/ui/button/index.js";
  import Chip from "./Chip.svelte";
  // Static illustration. Real calculations run on the TradeEnvelope backend after sign-up.
  const inputs = [
    ["Buyer ceiling (CIF)", "$730.00 / MT"],
    ["Supplier quote (FOB)", "$680.00 / MT"],
    ["Est. freight", "$32.00 / MT"],
  ];
</script>

<section aria-label="Example deal triage" class="rounded border bg-card">
  <header class="flex h-10 items-center justify-between border-b px-3">
    <span class="col-head">Example: a 30-second dead-deal triage</span>
    <Chip kind="desk">AGO 50 PPM · 30,000 MT</Chip>
  </header>
  <div class="grid gap-px bg-border md:grid-cols-4">
    {#each inputs as [k, v]}
      <div class="bg-card p-3">
        <div class="text-xs text-muted-foreground">{k}</div>
        <div class="num mt-1 text-base">{v}</div>
      </div>
    {/each}
    <div class="bg-card p-3">
      <div class="text-xs text-muted-foreground">Commercial room</div>
      <div class="mt-1 flex items-center gap-2">
        <span class="num text-xl text-viable">+$16.83/MT</span><Chip
          kind="viable">VIABLE</Chip
        >
      </div>
      <div class="num mt-0.5 text-xs text-muted-foreground">
        ≈ $504.9k on 30,000 MT
      </div>
    </div>
  </div>
  <footer
    class="flex flex-wrap items-center justify-between gap-2 border-t bg-muted px-3 py-2"
  >
    <div class="flex items-center gap-2 text-sm">
      <span class="text-xs text-muted-foreground"
        >Proposed fee pool $10.00/MT</span
      >
      <Chip kind="viable">FUNDED</Chip>
      <span class="num text-xs text-muted-foreground"
        >+$6.83/MT desk buffer</span
      >
    </div>
    <Button href="/register" size="sm" class="h-7">Model your own deal</Button>
  </footer>
</section>
