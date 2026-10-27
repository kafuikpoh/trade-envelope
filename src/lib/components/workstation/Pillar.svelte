<script lang="ts">
  import Chip from "#lib/components/marketing/Chip.svelte";
  import { flash } from "#lib/actions/flash.ts";
  import type { Status } from "#lib/api/schemas.js";

  type C = { kind: Status | "desk"; text: string };

  let {
    title,
    chips = [],
    value,
    tone = "viable",
    sub,
    note,
    left,
    right,
  }: {
    title: string;
    chips?: C[];
    value: string;
    tone?: Status;
    sub?: string;
    note?: string;
    left?: string;
    right?: string;
  } = $props();
  const color = { viable: "text-viable", tight: "text-tight", doa: "text-doa" };
</script>

<section class="rounded border bg-card p-3" aria-label={title}>
  <div class="flex items-center justify-between gap-2">
    <h2 class="col-head">{title}</h2>
    <div class="flex gap-1">
      {#each chips as c}
        <Chip kind={c.kind}>{c.text}</Chip>
      {/each}
    </div>
  </div>
  <div class="mt-2 flex items-baseline gap-2">
    <span class="num text-2xl {color[tone]}" use:flash={value}>{value}</span
    >{#if sub}<span class="num text-xs text-muted-foreground">{sub}</span>{/if}
  </div>
  {#if note}
    <p class="mt-1 border-t pt-1 text-xs text-tight">⚠ {note}</p>
  {/if}
  {#if left || right}
    <div
      class="num mt-2 flex justify-between border-t pt-1 text-xs text-muted-foreground"
    >
      <span>{left}</span><span>{right}</span>
    </div>
  {/if}
</section>
