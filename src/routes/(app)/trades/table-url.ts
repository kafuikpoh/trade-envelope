export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100; // the handler clamps pageSize to 100 itself
export const PAGE_SIZES = [10, 20, 50, MAX_PAGE_SIZE];

/** TanStack column id -> the API's whitelisted sortColumn. Any other column falls back to newest-first. */
export const SORT_COLUMN: Record<string, string> = {
  referenceNumber: "referenceNumber",
  viabilityThresholdUsdPerMt: "viabilityThreshold",
  product: "product",
  quantityMt: "quantity",
  bestRoomUsdPerMt: "bestRoom",
};

export type SortOrder = "asc" | "desc";

export type TableParams = {
  page: number;
  pageSize: number;
  /** Column id, or "" for the API's newest-first default. */
  sortColumn: string;
  sortOrder: SortOrder;
  searchTerm: string;
};

const positiveInt = (value: string | null, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

/** Shared by the server load and the table so browser and server agree on what the URL means. */
export function readParams(url: URL): TableParams {
  const q = url.searchParams;
  const sortColumn = q.get("sortColumn") ?? "";
  const requested = positiveInt(q.get("pageSize"), DEFAULT_PAGE_SIZE);
  // Hand-edited URLs may ask for a size the control cannot show, so snap to the nearest one.
  const pageSize = PAGE_SIZES.reduce(
    (best, size) =>
      Math.abs(size - requested) < Math.abs(best - requested) ? size : best,
    DEFAULT_PAGE_SIZE,
  );
  return {
    page: positiveInt(q.get("page"), 1),
    pageSize,
    sortColumn: SORT_COLUMN[sortColumn] ? sortColumn : "",
    sortOrder: q.get("sortOrder") === "asc" ? "asc" : "desc",
    searchTerm: q.get("searchTerm")?.trim() ?? "",
  };
}

/** Defaults are omitted so the URL stays readable. */
export function toQuery(params: TableParams): string {
  const q = new URLSearchParams();
  if (params.page > 1) q.set("page", String(params.page));
  if (params.pageSize !== DEFAULT_PAGE_SIZE) q.set("pageSize", String(params.pageSize));
  if (params.searchTerm) q.set("searchTerm", params.searchTerm);
  if (params.sortColumn) {
    q.set("sortColumn", params.sortColumn);
    q.set("sortOrder", params.sortOrder);
  }
  return q.toString();
}
