<script lang="ts">
  import { goto } from "$app/navigation";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import CopyPlusIcon from "@lucide/svelte/icons/copy-plus";
  import EllipsisIcon from "@lucide/svelte/icons/ellipsis";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import { toast } from "svelte-sonner";
  import { Button } from "#lib/components/ui/button/index.js";
  import * as DropdownMenu from "#lib/components/ui/dropdown-menu/index.js";
  import DealDuplicateDialog from "./deal-duplicate-dialog.svelte";

  let {
    id,
    referenceNumber,
  }: { id: string; referenceNumber: string } = $props();

  // Controlled open state: a trigger nested inside a menu item fights the menu for focus.
  let showDuplicate = $state(false);

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(referenceNumber);
      toast.success(`${referenceNumber} copied`);
    } catch {
      toast.error("Clipboard unavailable");
    }
  }
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon"
        class="text-muted-foreground size-6"
        aria-label="Deal actions"
      >
        <EllipsisIcon />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="w-44">
    <DropdownMenu.Item onclick={() => void goto(`/trades/${id}`)}>
      <ExternalLinkIcon />
      Open
    </DropdownMenu.Item>
    <DropdownMenu.Item onclick={copyReference}>
      <CopyIcon />
      Copy reference
    </DropdownMenu.Item>
    <DropdownMenu.Item onclick={() => (showDuplicate = true)}>
      <CopyPlusIcon />
      Duplicate deal
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

{#if showDuplicate}
  <DealDuplicateDialog
    {id}
    {referenceNumber}
    bind:open={showDuplicate}
  />
{/if}
