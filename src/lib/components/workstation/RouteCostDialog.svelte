<script lang="ts">
  import SubmitButton from "./SubmitButton.svelte";
  import { defaults, superForm } from "sveltekit-superforms";
  import { zod4 } from "sveltekit-superforms/adapters";
  import * as Dialog from "#lib/components/ui/dialog/index.js";
  import FormField from "#lib/components/forms/FormField.svelte";
  import { CostRequest } from "#lib/api/schemas.js";
  import type { Workstation } from "#lib/workstation.svelte.js";
  let {
    ws,
    offerId,
    open = $bindable(false),
  }: { ws: Workstation; offerId: string; open: boolean } = $props();
  const form = superForm(
    defaults({ name: "Ocean Freight", category: "Freight" }, zod4(CostRequest)),
    {
      SPA: true,
      validators: zod4(CostRequest),
      resetForm: false,
      onUpdate: async ({ form: f }) => {
        if (!f.valid) return;
        await ws.run({
          method: "PUT",
          path: `/trade-opportunities/${ws.opp.id}/offers/${offerId}/route-costs`,
          body: f.data,
          success: "Route cost saved",
        });
        if (!ws.error) open = false;
      },
    },
  );
  const { form: d, enhance, submitting } = form;
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="rounded sm:max-w-md">
    <Dialog.Header
      ><Dialog.Title>Add route cost</Dialog.Title><Dialog.Description
        >Same name and category replaces the earlier cost.</Dialog.Description
      ></Dialog.Header
    >
    <form method="POST" use:enhance class="grid grid-cols-2 gap-2">
      <FormField {form} name="name" label="Name" bind:value={$d.name} />
      <FormField
        {form}
        name="category"
        label="Category"
        bind:value={$d.category}
      />
      <FormField
        {form}
        name="amountPerMtUsd"
        type="number"
        label="Amount, $/MT"
        bind:value={$d.amountPerMtUsd}
      />
      {#if ws.error}<p
          class="col-span-2 whitespace-pre-line text-xs text-doa"
          role="alert"
        >
          {ws.error}
        </p>{/if}
      <SubmitButton class="col-span-2" busy={$submitting || ws.busy}
        >Save route cost</SubmitButton
      >
    </form>
  </Dialog.Content>
</Dialog.Root>
