<script lang="ts">
  import { goto } from "$app/navigation";
  import {
    FlexRender,
    createTable,
    functionalUpdate,
    type ColumnDef,
    type SortingState,
  } from "@tanstack/svelte-table";
  import * as Pagination from "#lib/components/ui/pagination/index.js";
  import * as Table from "#lib/components/ui/table/index.js";
  import * as Empty from "#lib/components/ui/empty/index.js";
  import { Button } from "#lib/components/ui/button/index.js";
  import InboxIcon from "@lucide/svelte/icons/inbox";
  import NewDealButton from "#lib/components/workstation/NewDealButton.svelte";
  import type { TradeOpportunitySummary } from "#lib/api/schemas.js";
  import { toQuery, type TableParams } from "./table-url.js";
  import { features, type DataTableFeatures } from "./data-table-features.js";
  import DataTableToolbar from "./data-table-toolbar.svelte";

  let {
    columns,
    rows,
    params,
    totalCount,
  }: {
    columns: ColumnDef<DataTableFeatures, TradeOpportunitySummary>[];
    rows: TradeOpportunitySummary[];
    params: TableParams;
    totalCount: number;
  } = $props();

  const lastPage = $derived(
    Math.max(1, Math.ceil(totalCount / params.pageSize)),
  );

  // The URL is the only source of truth: manual sorting means TanStack tracks which column is
  // sorted and never re-sorts rows that the API already ordered.
  const sorting = $derived<SortingState>(
    params.sortColumn
      ? [{ id: params.sortColumn, desc: params.sortOrder === "desc" }]
      : [],
  );

  const href = (page: number) =>
    `?${toQuery({ ...params, page: Math.min(Math.max(page, 1), lastPage) })}`;

  const table = createTable({
    features,
    get columns() {
      return columns;
    },
    get data() {
      return rows;
    },
    manualSorting: true,
    state: {
      get sorting() {
        return sorting;
      },
    },
    onSortingChange: (updater) => {
      const next = functionalUpdate(updater, sorting)[0];
      void goto(
        `?${toQuery({
          ...params,
          page: 1,
          sortColumn: next?.id ?? "",
          sortOrder: next?.desc ? "desc" : "asc",
        })}`,
        { reset: false },
      );
    },
  });

  const range = $derived(
    totalCount === 0
      ? "No deals"
      : rows.length === 0
        ? `Nothing on page ${params.page} — ${lastPage} page(s) available`
        : `Showing ${(params.page - 1) * params.pageSize + 1}–${Math.min(
            params.page * params.pageSize,
            totalCount,
          )} of ${totalCount}`,
  );

  const go = (next: Partial<TableParams>) =>
    void goto(`?${toQuery({ ...params, page: 1, ...next })}`, { reset: false });

  const empty = $derived(
    params.searchTerm
      ? {
          title: `No deals match “${params.searchTerm}”`,
          hint: "The backend searches the reference number only.",
          action: "Clear search",
          run: () => go({ searchTerm: "" }),
        }
      : params.page > 1
        ? {
            title: `Page ${params.page} is past the last page`,
            hint: `Results end at page ${lastPage}.`,
            action: "Go to the last page",
            run: () => void goto(href(lastPage), { reset: false }),
          }
        : {
            title: "No deals yet",
            hint: "Start the first draft and it appears here.",
            action: "",
            run: () => {},
          },
  );
</script>

<div class="flex flex-col gap-2">
  <DataTableToolbar {params} />
  <div class="rounded border bg-card">
    <Table.Root class="text-sm">
      <Table.Header>
        {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head colspan={header.colSpan} class="h-7">
                {#if !header.isPlaceholder}
                  <FlexRender {header} />
                {/if}
              </Table.Head>
            {/each}
          </Table.Row>
        {/each}
      </Table.Header>
      <Table.Body>
        {#each table.getRowModel().rows as row (row.id)}
          <Table.Row class="h-8">
            {#each row.getVisibleCells() as cell (cell.id)}
              <Table.Cell>
                <FlexRender {cell} />
              </Table.Cell>
            {/each}
          </Table.Row>
        {:else}
          <Table.Row>
            <Table.Cell colspan={columns.length} class="p-2">
              <Empty.Root class="gap-2 border-0 py-8">
                <Empty.Header>
                  <Empty.Media variant="icon"><InboxIcon /></Empty.Media>
                  <Empty.Title class="text-sm">{empty.title}</Empty.Title>
                  <Empty.Description class="text-xs">{empty.hint}</Empty.Description>
                </Empty.Header>
                <Empty.Content class="flex-row gap-2">
                  {#if empty.action}
                    <Button variant="outline" size="sm" onclick={empty.run}
                      >{empty.action}</Button
                    >
                  {:else}
                    <NewDealButton />
                  {/if}
                </Empty.Content>
              </Empty.Root>
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>

  <div class="flex items-center justify-between gap-3">
    <span class="text-muted-foreground text-xs">{range}</span>
    <Pagination.Root
      count={totalCount}
      perPage={params.pageSize}
      page={params.page}
      onPageChange={(next) => void goto(href(next), { reset: false })}
      class="w-auto"
    >
      {#snippet children({ pages, currentPage })}
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous disabled={currentPage <= 1} />
          </Pagination.Item>
          {#each pages as page (page.key)}
            <Pagination.Item>
              {#if page.type === "ellipsis"}
                <Pagination.Ellipsis />
              {:else}
                <Pagination.Link {page} isActive={currentPage === page.value} />
              {/if}
            </Pagination.Item>
          {/each}
          <Pagination.Item>
            <Pagination.Next disabled={currentPage >= lastPage} />
          </Pagination.Item>
        </Pagination.Content>
      {/snippet}
    </Pagination.Root>
  </div>
</div>
