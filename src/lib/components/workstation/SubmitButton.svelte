<script lang="ts">
  import * as Form from "#lib/components/ui/form/index.js";
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";
  let {
    busy = false,
    class: cls = "",
    children,
  }: { busy?: boolean; class?: string; children: any } = $props();
</script>

<Form.Button class={cls} disabled={busy} aria-busy={busy}>
  {#if busy}<LoaderCircle
      class="size-3.5 animate-spin"
      aria-hidden="true"
    />{/if}{@render children()}
</Form.Button>
