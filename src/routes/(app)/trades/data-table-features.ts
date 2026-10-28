import {
  columnVisibilityFeature,
  rowSortingFeature,
  tableFeatures,
  type Column,
} from "@tanstack/svelte-table";
import type { TradeOpportunitySummary } from "#lib/api/schemas.js";

/**
 * Only sorting and visibility are registered. Paging and filtering are the API's job, so no
 * paginated or filtered row model is wired in — the rows from the loader are already the page.
 */
export const features = tableFeatures({ rowSortingFeature, columnVisibilityFeature });

export type DataTableFeatures = typeof features;

/** The header only needs these two members; naming them avoids pinning the column's TValue. */
export type SortableHeaderColumn = Pick<
  Column<DataTableFeatures, TradeOpportunitySummary>,
  "getIsSorted" | "getToggleSortingHandler"
>;
