<script lang="ts">
  import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";
  import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
  import { Button } from "#lib/components/ui/button/index.js";
  import type { SortableHeaderColumn } from "./data-table-features.js";

  let {
    column,
    label,
  }: { column: SortableHeaderColumn; label: string } = $props();

  const direction = $derived(column.getIsSorted());
</script>

<Button
  variant="ghost"
  size="sm"
  class="col-head h-6 px-1"
  onclick={column.getToggleSortingHandler()}
>
  {label}
  {#if direction === "asc"}
    <ArrowUpIcon data-icon="inline-end" />
  {:else if direction === "desc"}
    <ArrowDownIcon data-icon="inline-end" />
  {:else}
    <ChevronsUpDownIcon data-icon="inline-end" />
  {/if}
</Button>
