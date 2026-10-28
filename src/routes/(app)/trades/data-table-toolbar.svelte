<script lang="ts">
  import { goto } from "$app/navigation";
  import SearchIcon from "@lucide/svelte/icons/search";
  import { untrack } from "svelte";
  import { Input } from "#lib/components/ui/input/index.js";
  import * as Select from "#lib/components/ui/select/index.js";
  import { PAGE_SIZES, toQuery, type TableParams } from "./table-url.js";

  let { params }: { params: TableParams } = $props();

  // svelte-ignore state_referenced_locally // seeded from the URL, then kept in sync below
  let term = $state(params.searchTerm);

  // Back/forward and the load function own the URL, so pull the box back in line with it.
  // The write is untracked to keep `term` out of this effect's dependencies.
  $effect(() => {
    const fromUrl = params.searchTerm;
    untrack(() => {
      if (fromUrl !== term) term = fromUrl;
    });
  });

  function apply(next: Partial<TableParams>) {
    void goto(`?${toQuery({ ...params, page: 1, ...next })}`, {
      reset: false,
      replace: true,
    });
  }

  // Debounced so a burst of keystrokes costs one request; the cleanup cancels a stale timer.
  $effect(() => {
    const trimmed = term.trim();
    if (trimmed === params.searchTerm) return;
    const timer = setTimeout(() => apply({ searchTerm: trimmed }), 350);
    return () => clearTimeout(timer);
  });

  const search = (event: KeyboardEvent) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const trimmed = term.trim();
    if (trimmed !== params.searchTerm) apply({ searchTerm: trimmed });
  };

  // Items must be declared up front: bits-ui resolves the trigger's label from them, and the
  // content (and therefore the Select.Items) is not mounted until the select opens.
  const pageSizeItems = PAGE_SIZES.map((size) => ({
    value: String(size),
    label: String(size),
  }));
</script>

<div class="flex items-center justify-between gap-2">
  <div class="relative w-full max-w-64">
    <SearchIcon
      class="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2"
    />
    <Input
      type="search"
      class="h-8 pl-7 text-sm"
      placeholder="Search reference"
      aria-label="Search deals by reference number"
      bind:value={term}
      onkeydown={search}
    />
  </div>
  <div class="text-muted-foreground flex items-center gap-2 text-xs">
    <span>Per page</span>
    <Select.Root
      type="single"
      items={pageSizeItems}
      value={String(params.pageSize)}
      onValueChange={(value) => {
        if (value) apply({ pageSize: Number(value) });
      }}
    >
      <Select.Trigger size="sm" class="text-xs">
        <Select.Value />
      </Select.Trigger>
      <Select.Content>
        {#each PAGE_SIZES as size (size)}
          <Select.Item value={String(size)}>{size}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>
</div>
