<script lang="ts">
  import SubmitButton from "./SubmitButton.svelte";
  import { defaults, superForm } from "sveltekit-superforms";
  import { zod4 } from "sveltekit-superforms/adapters";
  import * as Form from "#lib/components/ui/form/index.js";
  import * as Card from '#lib/components/ui/card/index.js';
  import * as Tabs from '#lib/components/ui/tabs/index.js';
  import * as Collapsible from '#lib/components/ui/collapsible/index.js';
  import * as Alert from '#lib/components/ui/alert/index.js';
  import { Button } from "#lib/components/ui/button/index.js";
  import { Input } from '#lib/components/ui/input/index.js';
  import { Label } from '#lib/components/ui/label/index.js';
  import { Separator } from '#lib/components/ui/separator/index.js';
  import FormField from "#lib/components/forms/FormField.svelte";
  import { call } from "#lib/api/client.js";
  import ClipboardCheck from "@lucide/svelte/icons/clipboard-check";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import { usd, signed, shortDate } from "#lib/format.js";
  import {
    BuyerForm,
    buyerDefaults,
    toBuyerRequest,
  } from "#lib/forms/buyer-requirement.js";
  import type { Workstation } from "#lib/workstation.svelte.js";

  let { ws }: { ws: Workstation } = $props();

  let open = $state(true);

  const base = $derived(`/trade-opportunities/${ws.opp.id}`);
  
  const form = superForm(defaults(buyerDefaults(ws.opp), zod4(BuyerForm)), {
    SPA: true,
    dataType: "json",
    validators: zod4(BuyerForm),
    resetForm: false,
    onUpdate: async ({ form: f }) => {
      if (!f.valid) return;
      const v = f.data;
      await ws.run(async () => {
        await call("PUT", `${base}/buyer-requirement`, toBuyerRequest(v));
        if (v.thresholdUsdPerMt !== ws.opp.viabilityThresholdUsdPerMt)
          await call("PUT", `${base}/viability-threshold`, {
            thresholdUsdPerMt: v.thresholdUsdPerMt,
          });
        for (const c of v.destinationCosts)
          await call("PUT", `${base}/destination-costs`, c);
      });
      if (!ws.error) form.reset({ data: buyerDefaults(ws.opp) as any });
    },
  });

  const { form: d, enhance, submitting } = form;
  const products: [string, string][] = [
    ["Ago", "AGO (Diesel 50 ppm)"],
    ["Pms", "PMS (Gasoline)"],
    ["JetA1", "Jet A-1"],
  ];

  const incoterms: [string, string][] = ["Fob", "Cfr", "Cif", "Dap"].map(
    (i) => [i, i.toUpperCase()],
  );

  const settlements: [string, string][] = [
    ["BillOfLading", "Bill of Lading"],
    ["Outturn", "Outturn"],
  ];

  const saved = $derived(ws.opp.destinationCosts.length);

  const addCost = () =>
    ($d.destinationCosts = [
      ...$d.destinationCosts,
      { name: "", category: "PortAndTerminalDues", amountPerMtUsd: 0 },
    ]);

  const ceiling = $derived(ws.opp.buyer?.priceCeiling);

  let mode = $state<"flat" | "indexed">(
    ws.opp.buyer?.priceCeiling.indexReference ? "indexed" : "flat",
  );

  const costTotal = $derived(
    $d.destinationCosts.reduce((t, c) => t + (c.amountPerMtUsd || 0), 0),
  );

  const spaced = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1 $2");
  const section = "gap-0 rounded-lg bg-muted/40 py-3 shadow-none";
  const title =
    "text-xs font-semibold uppercase tracking-wide text-muted-foreground";
  const card = "rounded-lg border bg-muted/40 p-3";
  const sub =
    "mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground";
  const tab = (on: boolean) =>
    `rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`;
</script>

<Card.Root class="gap-0 rounded-xl p-3 shadow-none">
  <Collapsible.Root bind:open>
    <Collapsible.Trigger
      class="flex w-full items-center justify-between gap-2 text-left {open
        ? 'border-b pb-3'
        : ''}"
    >
      <h2
        class="flex items-center gap-2 text-sm font-bold uppercase tracking-wide"
      >
        <ClipboardCheck
          class="size-4 shrink-0 text-primary"
          aria-hidden="true"
        />1. Buyer requirement
      </h2>
      {#if open}<ChevronUp
          class="size-4 text-muted-foreground"
          aria-hidden="true"
        />{:else}<ChevronDown
          class="size-4 text-muted-foreground"
          aria-hidden="true"
        />{/if}
    </Collapsible.Trigger>
    <Collapsible.Content>
      <form method="POST" use:enhance class="mt-3 space-y-3">
        <Card.Root class={section}>
          <Card.Header class="px-3 pb-3"
            ><Card.Title class={title}>Product &amp; cargo spec</Card.Title
            ></Card.Header
          >
          <Card.Content class="px-3">
            <div class="grid grid-cols-2 gap-2">
              <div class="col-span-2">
                <FormField
                  {form}
                  name="product"
                  type="select"
                  options={products}
                  label="Product"
                  bind:value={$d.product}
                />
              </div>
              <FormField
                {form}
                name="quantityMt"
                type="number"
                label="Cargo volume, MT"
                bind:value={$d.quantityMt}
              />
              <FormField
                {form}
                name="tolerancePercent"
                type="number"
                label="Tolerance, ±%"
                bind:value={$d.tolerancePercent}
              />
            </div>
            <Separator class="my-3" />
            <Form.Field {form} name="thresholdUsdPerMt">
              <Form.Control>
                {#snippet children({ props })}
                  <div class="flex items-center justify-between gap-2">
                    <Label for={props.id} class="text-xs text-muted-foreground"
                      >Viability threshold</Label
                    >
                    <span class="flex items-center gap-1"
                      ><span
                        class="text-sm text-muted-foreground"
                        aria-hidden="true">$</span
                      >
                      <Input
                        {...props}
                        type="number"
                        step="any"
                        class="num h-7 w-20 text-right"
                        bind:value={$d.thresholdUsdPerMt}
                      />
                      <span class="font-mono text-xs text-muted-foreground"
                        >/ MT</span
                      ></span
                    >
                  </div>
                {/snippet}
              </Form.Control>
              <Form.FieldErrors class="text-xs" />
            </Form.Field>
          </Card.Content>
        </Card.Root>

        <Tabs.Root bind:value={mode}>
          <Card.Root class={section}>
            <Card.Header
              class="flex flex-row items-start justify-between gap-2 px-3 pb-3"
            >
              <Card.Title class={title}
                >Price ceiling ({$d.ceilingIncoterm.toUpperCase()} target)</Card.Title
              >
              <Tabs.List
                class="h-7 shrink-0 p-0.5"
                aria-label="Price ceiling type"
              >
                <Tabs.Trigger
                  value="flat"
                  class="h-6 px-2 font-mono text-[10px] font-semibold"
                  >Flat</Tabs.Trigger
                >
                <Tabs.Trigger
                  value="indexed"
                  class="h-6 px-2 font-mono text-[10px] font-semibold"
                  >Indexed</Tabs.Trigger
                >
              </Tabs.List>
            </Card.Header>
            <Card.Content class="space-y-3 px-3">
              <Form.Field {form} name="ceilingUsdPerMt">
                <Form.Control>
                  {#snippet children({ props })}
                    <Label for={props.id} class="sr-only"
                      >Ceiling, USD per MT</Label
                    >
                    <div class="relative">
                      <span
                        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true">$</span
                      >
                      <Input
                        {...props}
                        type="number"
                        step="any"
                        class="num h-11 pl-7 pr-20 text-lg md:text-lg"
                        bind:value={$d.ceilingUsdPerMt}
                      />
                      <span
                        class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground"
                        >USD / MT</span
                      >
                    </div>
                  {/snippet}
                </Form.Control>
                <Form.FieldErrors class="text-xs" />
              </Form.Field>
              <Tabs.Content value="indexed">
                {#if ceiling?.indexReference}
                  <dl
                    class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-md border bg-background p-2 font-mono text-xs"
                  >
                    <dt class="text-muted-foreground">Index benchmark:</dt>
                    <dd class="font-semibold">{ceiling.indexReference}</dd>
                    {#if ceiling.differential != null}<dt
                        class="text-muted-foreground"
                      >
                        Differential:
                      </dt>
                      <dd
                        class="font-semibold {ceiling.differential < 0
                          ? 'text-doa'
                          : 'text-viable'}"
                      >
                        {signed(ceiling.differential)} / MT
                      </dd>{/if}
                    {#if ceiling.anchor}<dt class="text-muted-foreground">
                        Pricing period:
                      </dt>
                      <dd>
                        {spaced(
                          ceiling.anchor,
                        )}{#if ceiling.daysBefore != null || ceiling.daysAfter != null}
                          ({ceiling.daysBefore ?? 0}d before / {ceiling.daysAfter ??
                            0}d after){/if}
                      </dd>{/if}
                    {#if ceiling.assumedBaseLevel != null}<dt
                        class="text-muted-foreground"
                      >
                        Assumed base level:
                      </dt>
                      <dd class="text-primary">
                        {usd(
                          ceiling.assumedBaseLevel,
                        )}{#if ceiling.assumedBaseAsOf}
                          (as of {shortDate(ceiling.assumedBaseAsOf)}){/if}
                      </dd>{/if}
                  </dl>
                {:else}<p class="text-xs text-muted-foreground">
                    Indexed ceilings can't be set from the UI yet. The flat
                    amount above is what gets saved.
                  </p>{/if}
              </Tabs.Content>
            </Card.Content>
          </Card.Root>
        </Tabs.Root>

        <Card.Root class={section}>
          <Card.Header class="px-3 pb-3"
            ><Card.Title class={title}>Logistics &amp; delivery</Card.Title
            ></Card.Header
          >
          <Card.Content class="px-3">
            <div class="grid grid-cols-2 gap-2">
              <FormField
                {form}
                name="ceilingIncoterm"
                type="select"
                options={incoterms}
                label="Target incoterm"
                bind:value={$d.ceilingIncoterm}
              />
              <FormField
                {form}
                name="settlement"
                type="select"
                options={settlements}
                label="Settlement basis"
                bind:value={$d.settlement}
              />
              <div class="col-span-2">
                <FormField
                  {form}
                  name="namedPlace"
                  label="Destination port"
                  hint="e.g. Tema"
                  bind:value={$d.namedPlace}
                />
              </div>
              <FormField
                {form}
                name="arrivalWindowStart"
                type="date"
                label="Arrival window start"
                bind:value={$d.arrivalWindowStart}
              />
              <FormField
                {form}
                name="arrivalWindowEnd"
                type="date"
                label="Arrival window end"
                bind:value={$d.arrivalWindowEnd}
              />
            </div>
            <Separator class="my-3" />
            <div class="mb-2 flex items-end justify-between gap-2">
              <h4 class="text-xs text-muted-foreground">
                Destination costs (DAP):<span
                  class="num block text-sm font-semibold text-foreground"
                  >{usd(costTotal)} / MT</span
                >
              </h4>
              <Button
                type="button"
                variant="link"
                size="sm"
                class="h-6 gap-1 px-0 text-xs"
                onclick={addCost}
                ><Plus class="size-3.5" aria-hidden="true" />Add cost</Button
              >
            </div>
            {#each $d.destinationCosts as _, i}
              <div
                class="mb-1 grid grid-cols-[1fr_84px_24px] items-start gap-1"
              >
                <FormField
                  {form}
                  name={`destinationCosts[${i}].name`}
                  label="Cost name {i + 1}"
                  hideLabel
                  bind:value={$d.destinationCosts[i].name}
                />
                <FormField
                  {form}
                  name={`destinationCosts[${i}].amountPerMtUsd`}
                  type="number"
                  label="Cost {i + 1}, $/MT"
                  hideLabel
                  bind:value={$d.destinationCosts[i].amountPerMtUsd}
                />
                {#if i >= saved}<Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="mt-0.5 h-7 px-0"
                    aria-label="Remove cost {i + 1}"
                    onclick={() =>
                      ($d.destinationCosts = $d.destinationCosts.filter(
                        (_, n) => n !== i,
                      ))}><X class="size-3.5" aria-hidden="true" /></Button
                  >{/if}
              </div>
            {:else}<p class="text-xs text-muted-foreground">
                None. Only used when the buyer is on DAP.
              </p>{/each}
          </Card.Content>
        </Card.Root>

        {#if ws.error && !ws.busy}
          <Alert.Root variant="destructive" class="px-3 py-2"
            ><CircleAlert aria-hidden="true" /><Alert.Description
              class="whitespace-pre-line text-xs">{ws.error}</Alert.Description
            ></Alert.Root
          >
        {/if}
        <SubmitButton class="w-full" busy={$submitting || ws.busy}
          >{ws.opp.buyer
            ? "Save requirement"
            : "Set buyer requirement"}</SubmitButton
        >
        {#if $d.ceilingIncoterm === "Cif"}<p
            class="border-t pt-2 text-xs text-muted-foreground"
          >
            Discharge port dues and inspection fees are excluded from the CIF
            boundary.
          </p>{/if}
      </form>
    </Collapsible.Content>
  </Collapsible.Root>
</Card.Root>
