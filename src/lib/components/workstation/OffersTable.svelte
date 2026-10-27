<script lang="ts">
  import { flip } from "svelte/animate";
  import { flash } from "#lib/actions/flash.ts";
  import Chip from "#lib/components/marketing/Chip.svelte";
  import { toStatus, humanize } from "#lib/api/schemas.js";
  import { usd, signed } from "#lib/format.js";
  import type { Workstation } from "#lib/workstation.svelte.js";

  let { ws }: { ws: Workstation } = $props();

  const dur =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 180;

  const cols = "grid-cols-[44px_1.7fr_104px_92px_88px_104px_110px_120px]";
</script>

<div class="overflow-x-auto">
  <div class="min-w-[860px]">
    <div
      class="grid h-7 items-center border-y bg-background px-2 col-head {cols}"
    >
      <span>Rank</span><span>Offer / place</span><span class="text-right"
        >Quoted</span
      ><span class="text-right">Norm. CIF</span><span class="text-right"
        >Room/MT</span
      ><span class="text-right">Total room</span><span class="pl-3">Tier 1</span
      ><span>Schedule</span>
    </div>
    {#each ws.rows as { offer: o, ev } (o.id)}
      {@const sel = o.id === ws.selected?.offer.id}
      <div
        role="row"
        tabindex="-1"
        animate:flip={{ duration: dur }}
        class="grid min-h-9 cursor-pointer items-center border-b px-2 py-1 text-sm {cols} {sel
          ? 'border-l-2 border-l-primary bg-accent'
          : 'hover:bg-muted'} {o.isWithdrawn ? 'opacity-50' : ''}"
        onclick={() => (ws.selectedId = o.id)}
      >
        <span class="num text-muted-foreground"
          >{ev && ev.rank > 0 && !o.isWithdrawn ? `#${ev.rank}` : "–"}</span
        >
        <button
          class="text-left focus-visible:outline-2 focus-visible:outline-ring {o.isWithdrawn
            ? 'line-through'
            : ''}"
          aria-pressed={sel}
          onclick={(e) => {
            e.stopPropagation();
            ws.selectedId = o.id;
          }}
        >
          <span class="font-medium">{o.supplierName}</span>
          <span class="text-xs text-muted-foreground"
            >({o.offerPrice.namedPlace}
            {o.offerPrice.incoterm.toUpperCase()})</span
          >
        </button>
        <span class="num text-right text-xs"
          >{o.offerPrice.flatAmount != null
            ? usd(o.offerPrice.flatAmount)
            : `${o.offerPrice.indexReference} ${signed(o.offerPrice.differential ?? 0, 0)}`}
          <span class="text-muted-foreground"
            >{o.offerPrice.incoterm.toUpperCase()}</span
          ></span
        >
        <span class="num text-right"
          >{ev?.bridge ? usd(ev.bridge.normalizedUsdPerMt) : "–"}</span
        >
        <span
          class="num text-right {ev?.roomUsdPerMt != null && ev.roomUsdPerMt < 0
            ? 'text-doa'
            : 'text-viable'}"
          use:flash={ev?.roomUsdPerMt}
          >{ev?.roomUsdPerMt != null ? signed(ev.roomUsdPerMt) : "–"}</span
        >
        <span class="num text-right" use:flash={ev?.totalRoom?.amount}>
          {ev?.totalRoom ? signed(ev.totalRoom.amount, 0) : "–"}</span
        >
        <span class="flex flex-wrap gap-1 pl-3"
          >{#if o.isWithdrawn}<Chip kind="tight">WITHDRAWN</Chip
            >{:else if ev?.viabilityStatus}<Chip
              kind={toStatus(ev.viabilityStatus)}
              >{humanize(ev.viabilityStatus)}</Chip
            >{/if}</span
        >
        <span
          >{#if !o.isWithdrawn && ev}<Chip kind={toStatus(ev.schedule)}
              >{humanize(ev.schedule)}</Chip
            >{/if}</span
        >
      </div>
    {:else}<p class="p-3 text-sm text-muted-foreground">
        No offers yet. Add the first supplier quote.
      </p>{/each}
  </div>
</div>
