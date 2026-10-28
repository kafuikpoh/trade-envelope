import { apiParsed } from "#lib/server/api.js";
import { paged, TradeOpportunitySummary } from "#lib/api/schemas.js";
import { readParams, SORT_COLUMN } from "./table-url.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url, cookies, fetch }) => {
  const params = readParams(url);
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.searchTerm) query.set("searchTerm", params.searchTerm);

  // The list query whitelists its sort columns; anything else means newest-first, which the
  // backend expresses by simply not sending a sortColumn.
  const apiSortColumn = SORT_COLUMN[params.sortColumn];
  if (apiSortColumn) {
    query.set("sortColumn", apiSortColumn);
    query.set("sortOrder", params.sortOrder);
  }

  const list = await apiParsed(
    fetch,
    cookies,
    "GET",
    `/trade-opportunities?${query}`,
    paged(TradeOpportunitySummary),
  );

  return { params, rows: list.items, totalCount: list.totalCount };
};
