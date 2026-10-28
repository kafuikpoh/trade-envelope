import {
  createColumnHelper,
  renderComponent,
  renderSnippet,
} from "@tanstack/svelte-table";
import { createRawSnippet } from "svelte";
import { shortDate, signed, usd } from "#lib/format.js";
import type { TradeOpportunitySummary } from "#lib/api/schemas.js";
import DealReferenceLink from "./deal-reference-link.svelte";
import DealRowActions from "./deal-row-actions.svelte";
import DealStateCell from "./deal-state-cell.svelte";
import SortableHeader from "./sortable-header.svelte";
import { features, type DataTableFeatures } from "./data-table-features.js";

const columnHelper =
  createColumnHelper<DataTableFeatures, TradeOpportunitySummary>();

/** Static header text; labels are literals here, so interpolating them is safe. */
function headLabel(label: string, alignRight = false) {
  const snippet = createRawSnippet(() => ({
    render: () =>
      `<div class="col-head${alignRight ? " text-right" : ""}">${label}</div>`,
  }));
  return () => renderSnippet(snippet);
}

const blankHead = () => {
  const snippet = createRawSnippet(() => ({ render: () => `<div></div>` }));
  return;
};

/** Closed .NET enum -> desk label, so the cell only ever interpolates one of our literals. */
const PRODUCT_LABEL: Record<string, string> = {
  Ago: "AGO",
  Pms: "PMS",
  JetA1: "JET A1",
};

const plainNum = createRawSnippet<[{ text: string }]>((get) => {
  const { text } = get();
  return { render: () => `<div class="num text-right">${text}</div>` };
});

/** A deal with no economics shows a bare dash, never a dash wearing the unit. */
function numCell(unit: string) {
  return createRawSnippet<[{ text: string | null }]>((get) => {
    const { text } = get();
    return {
      render: () =>
        `<div class="num text-right">${text ?? "—"}${
          text === null
            ? ""
            : `<span class="text-muted-foreground">${unit}</span>`
        }</div>`,
    };
  });
}

const quantityCell = numCell(" MT");
const roomCell = numCell("/MT");

export const columns = columnHelper.columns([
  columnHelper.accessor("referenceNumber", {
    header: ({ column }) =>
      renderComponent(SortableHeader, { column, label: "Reference" }),
    cell: ({ row }) =>
      renderComponent(DealReferenceLink, {
        id: row.original.id,
        referenceNumber: row.original.referenceNumber,
      }),
  }),
  columnHelper.display({
    id: "state",
    enableSorting: false,
    header: headLabel("Deal state"),
    cell: ({ row }) => renderComponent(DealStateCell, { row: row.original }),
  }),
  columnHelper.accessor("product", {
    header: ({ column }) =>
      renderComponent(SortableHeader, { column, label: "Product" }),
    cell: ({ row }) => {
      const snippet = createRawSnippet<[{ label: string }]>((get) => {
        const { label } = get();
        return { render: () => `<div>${label}</div>` };
      });
      return renderSnippet(snippet, {
        label: PRODUCT_LABEL[row.original.product ?? ""] ?? "—",
      });
    },
  }),
  columnHelper.accessor("quantityMt", {
    header: ({ column }) =>
      renderComponent(SortableHeader, { column, label: "Qty" }),
    cell: ({ row }) => {
      const quantityMt = row.original.quantityMt;
      return renderSnippet(quantityCell, {
        text: quantityMt == null ? null : quantityMt.toLocaleString("en-US"),
      });
    },
  }),
  columnHelper.accessor("bestRoomUsdPerMt", {
    header: ({ column }) =>
      renderComponent(SortableHeader, { column, label: "Best room" }),
    cell: ({ row }) => {
      const room = row.original.bestRoomUsdPerMt;
      return renderSnippet(roomCell, {
        text: room == null ? null : signed(room),
      });
    },
  }),
  columnHelper.display({
    id: "offers",
    enableSorting: false,
    header: headLabel("Offers", true),
    cell: ({ row }) => {
      const snippet = createRawSnippet<[{ active: number; total: number }]>((
        get,
      ) => {
        const { active, total } = get();
        return {
          render: () => `<div class="num text-right">${active}/${total}</div>`,
        };
      });
      return renderSnippet(snippet, {
        active: row.original.activeOfferCount,
        total: row.original.totalOfferCount,
      });
    },
  }),
  columnHelper.accessor("viabilityThresholdUsdPerMt", {
    header: ({ column }) =>
      renderComponent(SortableHeader, { column, label: "Threshold" }),
    cell: ({ row }) => {
      const snippet = createRawSnippet<[{ amount: number }]>((get) => {
        const { amount } = get();
        return {
          render: () =>
            `<div class="num text-right">${usd(amount)}<span class="text-muted-foreground">/MT</span></div>`,
        };
      });
      return renderSnippet(snippet, {
        amount: row.original.viabilityThresholdUsdPerMt,
      });
    },
  }),
  columnHelper.accessor("lastEvaluatedAtUtc", {
    enableSorting: false,
    header: headLabel("Evaluated", true),
    cell: ({ row }) => {
      const evaluatedAt = row.original.lastEvaluatedAtUtc;
      return renderSnippet(plainNum, {
        text: evaluatedAt ? shortDate(evaluatedAt) : "—",
      });
    },
  }),
  columnHelper.display({
    id: "actions",
    enableSorting: false,
    header: blankHead,
    cell: ({ row }) =>
      renderComponent(DealRowActions, {
        id: row.original.id,
        referenceNumber: row.original.referenceNumber,
      }),
  }),
]);
