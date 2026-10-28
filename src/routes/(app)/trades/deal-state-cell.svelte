<script lang="ts">
  import Chip from "#lib/components/marketing/Chip.svelte";
  import {
    humanize,
    toStatus,
    type TradeOpportunitySummary,
  } from "#lib/api/schemas.js";

  let { row }: { row: TradeOpportunitySummary } = $props();

  // The API's projection of the winning offer; the completeness cases below explain why a deal
  // has no status yet, and NOT EVALUATED means it was edited (or never opened) since.
  const state = $derived<{
    kind: "viable" | "tight" | "doa" | "desk";
    label: string;
  }>(
    row.bestViabilityStatus
      ? { kind: toStatus(row.bestViabilityStatus), label: humanize(row.bestViabilityStatus) }
      : !row.hasBuyerRequirement
        ? { kind: "tight", label: "NO BUYER" }
        : row.activeOfferCount > 0
          ? { kind: "desk", label: "NOT EVALUATED" }
          : row.totalOfferCount > 0
            ? { kind: "doa", label: "ALL WITHDRAWN" }
            : { kind: "tight", label: "NO OFFERS" },
  );
</script>

<Chip kind={state.kind}>{state.label}</Chip>
