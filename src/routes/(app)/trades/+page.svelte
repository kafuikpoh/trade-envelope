<script lang="ts">
  import Chip from "#lib/components/marketing/Chip.svelte";

  let { data } = $props();
</script>

<div class="rounded border bg-card">
  <div
    class="grid h-7 grid-cols-[1fr_1fr_100px_100px] items-center border-b bg-background px-3 col-head"
  >
    <span>Ref</span><span>Product</span><span class="text-right">Room $/MT</span
    ><span>Status</span>
  </div>
  {#each data.trades as t}
    <a
      href="/trades/{t.id}"
      class="grid h-8 grid-cols-[1fr_1fr_100px_100px] items-center border-b px-3 text-sm hover:bg-accent"
      ><span class="num">{t.ref}</span><span>{t.product}</span><span
        class="num text-right">{t.room.toFixed(2)}</span
      ><Chip kind={t.status}>{t.status.toUpperCase()}</Chip></a
    >
  {:else}
    <p class="p-3 text-sm text-muted-foreground">
      No deals yet. Select + New deal to open a draft.
    </p>
  {/each}
</div>
