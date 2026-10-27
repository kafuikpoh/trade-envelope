<script lang="ts">
  import { Button } from "#lib/components/ui/button/index.js";
  import Copy from "@lucide/svelte/icons/copy";
  import Check from "@lucide/svelte/icons/check";

  let { value }: { value: string } = $props();

  let copied = $state(false);
  
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }
</script>

<Button
  type="button"
  variant="outline"
  size="sm"
  class="num h-7 gap-1.5 px-2 text-xs"
  onclick={copy}
  aria-label="Copy reference {value}"
>
  <span class="text-muted-foreground">Ref:</span>
  {value}
  {#if copied}<Check
      class="size-3.5 text-viable"
      aria-hidden="true"
    />{:else}<Copy
      class="size-3.5 text-muted-foreground"
      aria-hidden="true"
    />{/if}
  <span class="sr-only" role="status">{copied ? "Copied" : ""}</span>
</Button>
