<script lang="ts">
  import { goto } from "$app/navigation";
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";
  import { Button } from "#lib/components/ui/button/index.js";
  import * as Dialog from "#lib/components/ui/dialog/index.js";
  import { Input } from "#lib/components/ui/input/index.js";
  import { Label } from "#lib/components/ui/label/index.js";
  import { call, idOf } from "#lib/api/client.js";

  let {
    id,
    referenceNumber,
    open = $bindable(false),
  }: { id: string; referenceNumber: string; open: boolean } = $props();

  // The source reference is never a valid target, so the field starts empty rather than prefilled.
  let target = $state(""),
    busy = $state(false),
    error = $state("");

  const reference = $derived(target.trim());

  async function duplicate() {
    if (!reference || busy) return;
    busy = true;
    error = "";
    try {
      const created = await call<unknown>(
        "POST",
        `/trade-opportunities/${id}/duplicate`,
        { referenceNumber: reference },
      );
      const newId = idOf(created);
      if (!newId)
        throw new Error("The deal was duplicated but the API returned no id.");
      open = false;
      await goto(`/trades/${newId}`);
    } catch (e) {
      error = e instanceof Error ? e.message : "Request failed";
    } finally {
      busy = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="rounded sm:max-w-md">
    <Dialog.Header
      ><Dialog.Title>Duplicate deal</Dialog.Title><Dialog.Description
        >Copies {referenceNumber}: buyer requirement, active offers with their
        route costs, destination costs and the threshold. Withdrawn quotes, the
        fee pool and the last evaluation are left behind.</Dialog.Description
      ></Dialog.Header
    >
    <form
      class="flex flex-col gap-3"
      onsubmit={(e) => {
        e.preventDefault();
        void duplicate();
      }}
    >
      <div class="flex flex-col">
        <Label
          for="duplicate-reference"
          class="text-xs text-muted-foreground">New reference</Label
        >
        <Input
          id="duplicate-reference"
          class="mt-0.5 h-7 num"
          placeholder="e.g. AGO-2026-003"
          bind:value={target}
          disabled={busy}
        />
      </div>
      {#if error}<p
          class="whitespace-pre-line text-xs text-doa"
          role="alert"
        >
          {error}
        </p>{/if}
      <Button type="submit" class="w-full" disabled={busy || !reference}>
        {#if busy}<LoaderCircle
            class="size-3.5 animate-spin"
            aria-hidden="true"
          />{/if}
        {busy ? "Duplicating…" : "Duplicate and open"}
      </Button>
    </form>
  </Dialog.Content>
</Dialog.Root>
