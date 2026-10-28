<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
  import { Button } from "#lib/components/ui/button/index.js";
  import * as Empty from "#lib/components/ui/empty/index.js";

  const title = $derived(
    page.status === 404
      ? "Nothing here"
      : page.status === 502
        ? "The API answered in a shape we did not expect"
        : "The trade API could not be reached",
  );
</script>

<Empty.Root class="gap-2 py-10">
  <Empty.Header>
    <Empty.Media variant="icon"><TriangleAlertIcon /></Empty.Media>
    <Empty.Title class="text-sm">{title}</Empty.Title>
    <Empty.Description class="text-xs">
      {page.error?.message ?? `Request failed with status ${page.status}.`}
    </Empty.Description>
  </Empty.Header>
  <Empty.Content class="flex-row gap-2">
    <Button variant="outline" size="sm" onclick={() => void goto("/trades")}>
      Back to the blotter
    </Button>
  </Empty.Content>
</Empty.Root>
