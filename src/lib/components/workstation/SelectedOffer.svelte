<script lang="ts">
  import * as AlertDialog from "#lib/components/ui/alert-dialog/index.js";
  import { Button, buttonVariants } from "#lib/components/ui/button/index.js";
  import { Input } from "#lib/components/ui/input/index.js";
  import Chip from "#lib/components/marketing/Chip.svelte";
  import RouteCostDialog from "./RouteCostDialog.svelte";
  import { warningText } from "#lib/api/schemas.js";
  import type { Workstation } from "#lib/workstation.svelte.js";
  import { flash } from "#lib/actions/flash.ts";

  let { ws }: { ws: Workstation } = $props();
  const s = $derived(ws.selected),
    o = $derived(s?.offer),
    ev = $derived(s?.ev);
  let addCost = $state(false);
  const base = $derived(
    o ? `/trade-opportunities/${ws.opp.id}/offers/${o.id}` : "",
  );
  const reprice = (v: string) => {
    const p = o!.offerPrice;
    ws.run({
      method: "PUT",
      path: `${base}/price`,
      body: {
        currency: p.currency,
        unit: p.unit,
        incoterm: p.incoterm,
        namedPlace: p.namedPlace,
        flatAmount: Number(v),
      },
    });
  };
  const setCost = (c: { name: string; category: string }, v: string) =>
    ws.run({
      method: "PUT",
      path: `${base}/route-costs`,
      success: "Route cost updated",
      body: { name: c.name, category: c.category, amountPerMtUsd: Number(v) },
    });
  const withdraw = () =>
    ws.run({
      method: "POST",
      path: `${base}/withdraw`,
      success: "Offer withdrawn",
    });
  const tile = "rounded border bg-background p-2";
</script>

{#if o}
  <section class="rounded border bg-card" aria-label="Selected offer">
    <div class="flex h-10 items-center justify-between border-b px-3">
      <h2 class="text-sm font-semibold">
        Selected offer: {o.supplierName} ({o.offerPrice.namedPlace}
        {o.offerPrice.incoterm.toUpperCase()})
      </h2>
      {#if !o.isWithdrawn}
        <AlertDialog.Root>
          <AlertDialog.Trigger
            class="{buttonVariants({
              variant: 'outline',
              size: 'sm',
            })} h-6 border-doa-bd px-2 text-xs text-doa hover:bg-doa-bg hover:text-doa"
            disabled={ws.busy}>Withdraw offer</AlertDialog.Trigger
          >
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Withdraw {o.supplierName}?</AlertDialog.Title>
              <AlertDialog.Description
                >It drops out of the ranking. Only the price can be edited
                later, so bringing it back means adding the offer again.</AlertDialog.Description
              >
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Keep offer</AlertDialog.Cancel>
              <AlertDialog.Action
                class={buttonVariants({ variant: "destructive" })}
                onclick={withdraw}>Withdraw</AlertDialog.Action
              >
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>
      {:else}<Chip kind="tight">WITHDRAWN</Chip>{/if}
    </div>
    <div class="space-y-3 p-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap gap-1">
          {#if ev}{#each ev.warnings as w}<Chip kind="tight"
                >{warningText(w).toUpperCase()}</Chip
              >{/each}{/if}
        </div>
        <span class="num text-xs text-muted-foreground"
          >Cargo: {o.quantityMt.toLocaleString()} MT{ws.opp.buyer
            ? ` ±${ws.opp.buyer.tolerancePercent}%`
            : ""}</span
        >
      </div>
      <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div class={tile}>
          <div class="col-head">Incoterm &amp; place</div>
          <div class="mt-1 text-sm">
            {o.offerPrice.incoterm.toUpperCase()}
            {o.offerPrice.namedPlace}
          </div>
        </div>
        <div class={tile}>
          <div class="col-head">Quoted price</div>
          {#if o.offerPrice.flatAmount != null}
            <div
              class="mt-1 flex items-center gap-1"
              use:flash={o.offerPrice.flatAmount}
            >
              <span class="num text-xs">$</span>
              <Input
                type="number"
                step="any"
                class="num h-6 px-1 text-right text-sm"
                aria-label="Quoted price, $/MT"
                disabled={o.isWithdrawn || ws.busy}
                value={o.offerPrice.flatAmount}
                onchange={(e) => reprice(e.currentTarget.value)}
              />
              <span class="num text-xs text-muted-foreground">/MT</span>
            </div>
          {:else}<div class="num mt-1 text-sm">
              {o.offerPrice.indexReference}
              {o.offerPrice.differential}
            </div>{/if}
        </div>
        <div class={tile}>
          <div class="col-head">Density @15°C</div>
          <div class="num mt-1 text-sm">
            {o.densityKgPerLitre.toFixed(4)} kg/L
          </div>
        </div>
        <div class={tile}>
          <div class="col-head">Transit</div>
          <div class="num mt-1 text-sm">
            {o.transitDays} days · {o.loadingTerminal}
          </div>
        </div>
      </div>

      <div class="rounded border">
        <div
          class="flex h-8 items-center justify-between border-b bg-background px-2"
        >
          <span class="col-head">Itemized route costs</span>
          {#if !o.isWithdrawn}<Button
              variant="ghost"
              size="sm"
              class="h-6 px-2 text-xs text-primary"
              onclick={() => (addCost = true)}>+ Add route cost</Button
            >{/if}
        </div>
        {#each o.routeCosts as c}
          <div class="flex items-center justify-between px-2 py-1 text-sm">
            <span
              >{c.name}
              <span class="text-xs text-muted-foreground">{c.category}</span
              ></span
            >
            <span class="flex items-center gap-1"
              ><span class="num text-xs">+$</span><Input
                type="number"
                step="any"
                class="num h-6 w-20 px-1 text-right text-sm"
                aria-label="{c.name}, $/MT"
                disabled={o.isWithdrawn || ws.busy}
                value={c.amountPerMtUsd}
                onchange={(e) => setCost(c, e.currentTarget.value)}
              /><span class="num text-xs text-muted-foreground">/MT</span></span
            >
          </div>
        {:else}<p class="px-2 py-2 text-sm text-muted-foreground">
            None. FOB offers need ocean freight to reach the buyer's terms.
          </p>{/each}
      </div>
    </div>
  </section>
  <RouteCostDialog {ws} offerId={o.id} bind:open={addCost} />
{/if}
