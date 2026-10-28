<script lang="ts">
  import * as Card from "#lib/components/ui/card/index.ts";
  import * as Alert from "#lib/components/ui/alert/index.ts";
  import * as AlertDialog from "#lib/components/ui/alert-dialog/index.ts";
  import * as Popover from "#lib/components/ui/popover/index.js";
  import * as Select from "#lib/components/ui/select/index.js";
  import { flash } from "#lib/actions/flash.ts";
  import { Button, buttonVariants } from "#lib/components/ui/button/index.js";
  import { Input } from "#lib/components/ui/input/index.js";
  import Chip from "#lib/components/marketing/Chip.svelte";
  import EntitlementDialog from "./EntitlementDialog.svelte";
  import Banknote from "@lucide/svelte/icons/banknote";
  import WandSparkles from "@lucide/svelte/icons/wand-sparkles";
  import Lock from "@lucide/svelte/icons/lock";
  import BadgeCheck from "@lucide/svelte/icons/badge-check";
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";
  import { usd, signed } from "#lib/format.js";
  import type { Workstation } from "#lib/workstation.svelte.js";
  import { Label } from "../ui/label";
  import { Separator } from "../ui/separator";
  import { fade } from "svelte/transition";

  let { ws }: { ws: Workstation } = $props();

  const a = $derived(ws.agreement),
    r = $derived(ws.reconcile),
    th = $derived(ws.selectedReconcile),
    qty = $derived(
      ws.selected?.ev?.quantityMt ?? ws.selected?.offer.quantityMt,
    ),
    room = $derived(ws.selected?.ev?.roomUsdPerMt);

  let draft = $state(10),
    side = $state<"Buyer" | "Seller">("Seller"),
    dlg = $state(false);

  let splitOpen = $state(false),
    buyerDraft = $state<number | undefined>(),
    splitError = $state("");

  const m = (s: string) => (ws.presentation ? "••••" : s);

  const spaced = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1 $2");

  // --- API calls (all amounts come from, and are validated by, the backend) ---
  const create = () =>
    ws.run({
      method: "POST",
      path: "/fee-agreements",
      body: { tradeOpportunityId: ws.opp.id, totalPoolUsdPerMt: draft },
      success: "Fee agreement created",
    });

  const setPool = (v: string) =>
    ws.run({
      method: "PUT",
      path: `/fee-agreements/${a!.id}/pool`,
      body: { totalPoolUsdPerMt: Number(v) },
      success: "Pool updated",
    });

  const remove = (id: string) =>
    ws.run({
      method: "DELETE",
      path: `/fee-agreements/${a!.id}/entitlements/${id}`,
      success: "Entitlement removed",
    });

  const setClaim = (id: string, status: string) =>
    ws.run({
      method: "PUT",
      path: `/fee-agreements/${a!.id}/entitlements/${id}/status`,
      body: { status },
      success: "Claim status updated",
    });

  async function saveSplit() {
    const total = a?.totalPoolUsdPerMt;
    if (
      buyerDraft == null ||
      total == null ||
      buyerDraft < 0 ||
      buyerDraft > total
    ) {
      splitError = "Buyer side must be between 0 and the total pool.";
      return;
    }
    splitError = "";
    await ws.run({
      method: "PUT",
      path: `/fee-agreements/${a!.id}/pool`,
      body: { totalPoolUsdPerMt: total, buyerSideUsdPerMt: buyerDraft },
      success: "Split updated",
    });
    if (!ws.error) splitOpen = false;
  }

  const canFit = $derived(
    a?.totalPoolUsdPerMt != null &&
      room != null &&
      room > 0 &&
      room !== a.totalPoolUsdPerMt,
  );

  // The API groups entitlements under each side, so one derived row feeds both pool cards.
  const sides = $derived(
    (
      [
        {
          key: "Seller",
          label: "Seller-Side Pool",
          side: a?.sellerSide,
          left: r?.sellerUnallocatedUsdPerMt,
        },
        {
          key: "Buyer",
          label: "Buyer-Side Pool",
          side: a?.buyerSide,
          left: r?.buyerUnallocatedUsdPerMt,
        },
      ] as const
    ).map(({ key, label, side, left }) => ({
      key,
      label,
      left,
      pool: side?.allocatedUsdPerMt,
      entitlements: side?.entitlements ?? [],
    })),
  );

  const split = $derived.by(() => {
    const total = a?.totalPoolUsdPerMt;
    const seller = a?.sellerSide.allocatedUsdPerMt;
    return total != null && seller != null
      ? Math.round((seller / total) * 100)
      : null;
  });
  const self = $derived(
    sides.flatMap((s) => s.entitlements).find((e) => e.isSelf),
  );

  // Reconcile returns these as Money, not bare numbers.
  const takeHome = $derived(th?.estimatedTakeHome?.amount);
  const poolPayout = $derived(th?.estimatedPoolPayout?.amount);

  const claims = (cur?: string) => [
    ...new Set(["Proposed", "Agreed", "ImfpaSigned", ...(cur ? [cur] : [])]),
  ];
  const claimColor = (s?: string) => {
    const v = s?.toLowerCase() ?? "";
    return v.includes("signed")
      ? "text-viable"
      : v.includes("agreed")
        ? "text-primary"
        : v.includes("proposed")
          ? "text-doa"
          : "text-muted-foreground";
  };

  const claim = (s?: string) => {
    const v = s?.toLowerCase() ?? "";
    if (v.includes("signed")) return "text-viable";
    if (v.includes("agreed")) return "text-primary";
    if (v.includes("proposed")) return "text-doa";
    return "text-muted-foreground";
  };

  const card = "rounded-lg border bg-muted/40 p-3";
  const section = "gap-0 rounded-lg bg-muted/40 py-3 shadow-none";
</script>

<Card.Root
  class="gap-3 rounded-xl p-3 shadow-none"
  aria-label="Fee pool and allocations"
>
  <Card.Header
    class="flex flex-row items-center justify-between gap-2 border-b p-0 pb-3"
  >
    <Card.Title
      class="flex items-center gap-2 text-sm font-bold uppercase tracking-wide"
      ><Banknote class="size-4 shrink-0 text-primary" aria-hidden="true" />3.
      Fee pool &amp; allocations</Card.Title
    >
    <span class="flex gap-1">
      {#if r?.isBalanced != null}<Chip kind={r.isBalanced ? "viable" : "tight"}
          >{r.isBalanced ? "Reconciled" : "Imbalance"}</Chip
        >{/if}
      {#if a?.totalPoolUsdPerMt != null}<Chip kind="tight"
          >Pool: {m(usd(a.totalPoolUsdPerMt))} / MT</Chip
        >{/if}
    </span>
  </Card.Header>

  <Card.Content class="space-y-3 p-0">
    {#if a}
      <Alert.Root
        variant={ws.error ? "destructive" : "default"}
        class="px-3 py-2"
        role="status"
      >
        {#if ws.busy}<LoaderCircle
            class="animate-spin"
            aria-hidden="true"
          />{:else if ws.error}<CircleAlert
            aria-hidden="true"
          />{:else}<CircleCheck aria-hidden="true" />{/if}
        <Alert.Description class="font-mono text-xs"
          >{ws.busy
            ? "Updating coverage status…"
            : ws.error
              ? "Last change failed"
              : "Coverage status updated (synced)"}</Alert.Description
        >
      </Alert.Root>
    {/if}

    <Card.Root class={section}>
      <Card.Content class="px-3">
        <div class="mb-2 flex items-center justify-between gap-2">
          <Label
            for="pool"
            class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >Total pool rate</Label
          >
          {#if canFit}<Button
              type="button"
              variant="link"
              size="sm"
              class="h-6 gap-1 px-0 text-xs"
              disabled={ws.busy || ws.presentation}
              onclick={() => setPool(String(room))}
              ><WandSparkles class="size-3.5" aria-hidden="true" />Fit to room ({m(
                signed(room! - a!.totalPoolUsdPerMt!),
              )})</Button
            >{/if}
        </div>
        {#if a}
          <div class="relative">
            <span
              class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true">$</span
            >
            <Input
              id="pool"
              type="number"
              step="any"
              class="num h-11 pl-7 pr-28 text-lg md:text-lg"
              disabled={ws.busy || ws.presentation}
              value={ws.presentation ? "" : a.totalPoolUsdPerMt}
              placeholder={ws.presentation ? "••••" : ""}
              onchange={(e) => setPool(e.currentTarget.value)}
            />
            <span
              class="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1"
            >
              <span
                class="pointer-events-none font-mono text-xs text-muted-foreground"
                >/ MT</span
              >
              {#if split != null}
                <Popover.Root
                  bind:open={splitOpen}
                  onOpenChange={(o) => {
                    if (o) {
                      buyerDraft = a?.buyerSide.allocatedUsdPerMt;
                      splitError = "";
                    }
                  }}
                >
                  <Popover.Trigger
                    class="{buttonVariants({
                      variant: 'ghost',
                      size: 'sm',
                    })} h-6 gap-1 px-1 font-mono text-xs text-tight"
                    aria-label="Edit buyer and seller split"
                    disabled={ws.busy || ws.presentation}
                    ><Lock class="size-3.5" aria-hidden="true" />{split}/{100 -
                      split}</Popover.Trigger
                  >
                  <Popover.Content class="w-64 space-y-2">
                    <Label for="buyer-side" class="text-xs"
                      >Buyer side, $/MT</Label
                    >
                    <Input
                      id="buyer-side"
                      type="number"
                      step="any"
                      class="num h-8 text-right"
                      bind:value={buyerDraft}
                    />
                    <p class="text-xs text-muted-foreground">
                      The seller side takes the rest of the pool.
                    </p>
                    {#if splitError}<p class="text-xs text-doa" role="alert">
                        {splitError}
                      </p>{/if}
                    <Button
                      size="sm"
                      class="w-full"
                      disabled={ws.busy}
                      onclick={saveSplit}>Save split</Button
                    >
                  </Popover.Content>
                </Popover.Root>
              {/if}
            </span>
          </div>
        {:else}
          <div class="flex gap-2">
            <Input
              id="pool"
              type="number"
              step="any"
              class="num h-8 text-right"
              bind:value={draft}
            />
            <Button
              class="h-8 shrink-0"
              disabled={ws.busy || !ws.rows.some((x) => x.ev)}
              onclick={create}>Create agreement</Button
            >
          </div>
          <p class="mt-2 text-xs text-muted-foreground">
            Needs an evaluated deal. Split defaults to 50/50 and can be changed
            after.
          </p>
        {/if}
      </Card.Content>
    </Card.Root>

    {#if a}
      {#each sides as s (s.key)}
        <Card.Root class={section}>
          <Card.Header
            class="flex flex-row items-start justify-between gap-2 px-3 pb-3"
          >
            <div>
              <Card.Title class="text-sm font-semibold"
                >{s.label}:
                <span class="num"
                  >{s.pool != null ? m(usd(s.pool)) : "–"} / MT</span
                ></Card.Title
              >
              {#if s.pool != null && qty != null}<p
                  class="num text-xs text-muted-foreground"
                >
                  {m(usd(s.pool * qty, 0))} total
                </p>{/if}
            </div>
            {#if s.left != null}{#if s.left === 0}<Chip kind="viable"
                  >Balanced</Chip
                >{:else}<Chip kind="tight">Unallocated {m(usd(s.left))}</Chip
                >{/if}{/if}
          </Card.Header>
          <Separator />
          <Card.Content class="space-y-2 px-3 pt-3">
            {#each s.entitlements as e (e.id)}
              <div
                in:fade={{ duration: 150 }}
                class="flex items-center justify-between gap-2 rounded-md border px-2 py-2 text-sm {e.isSelf
                  ? 'border-primary bg-accent'
                  : 'bg-background'}"
              >
                <div class="min-w-0">
                  <span class="flex items-center gap-1.5">
                    {#if e.isSelf}<BadgeCheck
                        class="size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />{/if}
                    <span
                      class="truncate {e.isSelf
                        ? 'font-semibold text-primary'
                        : 'font-medium'}">{e.participantName}</span
                    >{#if e.isSelf}<Chip kind="desk">ISSELF</Chip>{/if}
                  </span>
                  <Select.Root
                    type="single"
                    value={e.status ?? ""}
                    onValueChange={(v) => {
                      if (v && v !== e.status) setClaim(e.id, v);
                    }}
                    disabled={ws.busy}
                  >
                    <Select.Trigger
                      class="h-5 w-auto gap-1 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-1 {claimColor(
                        e.status,
                      )}"
                      aria-label="Claim status for {e.participantName}"
                      >Claim: {e.status ?? "–"}</Select.Trigger
                    >
                    <Select.Content
                      >{#each claims(e.status) as c (c)}<Select.Item
                          value={c}
                          label={spaced(c)}
                          class="text-xs"
                        />{/each}</Select.Content
                    >
                  </Select.Root>
                </div>
                <span class="flex shrink-0 items-center gap-1">
                  <span
                    class={e.isSelf ? "text-primary" : "text-muted-foreground"}
                    aria-hidden="true">$</span
                  >
                  <span
                    class="num w-12 text-right {e.isSelf ? 'text-primary' : ''}"
                    >{m(e.rateUsdPerMt.toFixed(2))}</span
                  >
                  <span
                    class="font-mono text-xs {e.isSelf
                      ? 'text-primary'
                      : 'text-muted-foreground'}">/MT</span
                  >
                  <AlertDialog.Root>
                    <AlertDialog.Trigger
                      class="{buttonVariants({
                        variant: 'ghost',
                        size: 'sm',
                      })} h-6 px-1"
                      aria-label="Remove {e.participantName}"
                      disabled={ws.busy}
                      ><X
                        class="size-3.5"
                        aria-hidden="true"
                      /></AlertDialog.Trigger
                    >
                    <AlertDialog.Content>
                      <AlertDialog.Header>
                        <AlertDialog.Title
                          >Remove {e.participantName}?</AlertDialog.Title
                        >
                        <AlertDialog.Description
                          >This frees {m(usd(e.rateUsdPerMt))}/MT on the {s.key.toLowerCase()}
                          side and changes the estimated take-home.</AlertDialog.Description
                        >
                      </AlertDialog.Header>
                      <AlertDialog.Footer
                        ><AlertDialog.Cancel>Cancel</AlertDialog.Cancel
                        ><AlertDialog.Action onclick={() => remove(e.id)}
                          >Remove</AlertDialog.Action
                        ></AlertDialog.Footer
                      >
                    </AlertDialog.Content>
                  </AlertDialog.Root>
                </span>
              </div>
            {:else}<p class="text-xs text-muted-foreground">
                No entitlements yet.
              </p>{/each}
            {#if s.left != null && s.left > 0}
              <Alert.Root
                class="flex items-center justify-between border-tight-bd bg-tight-bg px-2 py-2 text-sm text-tight"
              >
                <span class="flex items-center gap-2"
                  ><span
                    class="size-1.5 rounded-full bg-tight"
                    aria-hidden="true"
                  ></span>Unallocated pool</span
                ><span class="num font-semibold">+{m(usd(s.left))} / MT</span>
              </Alert.Root>
            {/if}
            <Button
              type="button"
              variant="link"
              size="sm"
              class="h-6 gap-1 px-0 text-xs"
              onclick={() => {
                side = s.key;
                dlg = true;
              }}
              ><Plus class="size-3.5" aria-hidden="true" />Add {s.key} entitlement</Button
            >
          </Card.Content>
        </Card.Root>
      {/each}

      {#if ws.error && !dlg}
        <Alert.Root variant="destructive" class="px-3 py-2"
          ><CircleAlert aria-hidden="true" /><Alert.Description
            class="whitespace-pre-line text-xs">{ws.error}</Alert.Description
          ></Alert.Root
        >
      {/if}

      <Card.Root
        class="gap-1 rounded-lg border-0 bg-[#0F172A] p-4 text-white shadow-none"
      >
        <div class="flex items-center justify-between text-sm">
          <span>Estimated take-home (this offer)</span><span
            class="font-mono text-[10px] font-semibold text-[#B4C5FF]"
            >DESK NET</span
          >
        </div>
        <div class="num text-3xl font-bold" use:flash={takeHome}>
          {takeHome != null ? m(usd(takeHome)) : "–"}
        </div>
        <p class="text-xs text-slate-300">
          {#if th && self && qty != null}Based on {m(usd(self.rateUsdPerMt))} / MT
            on {qty.toLocaleString()} MT entitlement{:else if th}From your own
            entitlement on this cargo.{:else}Evaluate the deal and add your own
            entitlement to see this.{/if}
        </p>
        {#if poolPayout != null}<p
            class="num text-xs text-slate-400"
          >
            Pool payout, all entitlements: {m(usd(poolPayout, 0))}
          </p>{/if}
      </Card.Root>
    {/if}
  </Card.Content>
</Card.Root>
{#if a}<EntitlementDialog {ws} {side} bind:open={dlg} />{/if}
