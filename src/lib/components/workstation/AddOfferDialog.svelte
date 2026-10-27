<script lang="ts">
  import SubmitButton from "./SubmitButton.svelte";
  import { defaults, superForm } from "sveltekit-superforms";
  import { zod4 } from "sveltekit-superforms/adapters";
  import * as Dialog from "#lib/components/ui/dialog/index.js";
  import FormField from "#lib/components/forms/FormField.svelte";
  import { call } from "#lib/api/client.js";
  import { AddOfferForm, toAddOfferRequest } from "#lib/forms/add-offer.js";
  import type { Workstation } from "#lib/workstation.svelte.js";

  let { ws, open = $bindable(false) }: { ws: Workstation; open: boolean } =
    $props();

  const buyer = $derived(ws.opp.buyer);

  const incoterms: [string, string][] = ["Fob", "Cfr", "Cif", "Dap"].map(
    (i) => [i, i.toUpperCase()],
  );

  const form = superForm(
    defaults({ qty: ws.opp.buyer?.quantityMt ?? 0 }, zod4(AddOfferForm)),
    {
      SPA: true,
      validators: zod4(AddOfferForm),
      resetForm: false,
      onUpdate: async ({ form: f }) => {
        if (!f.valid || !buyer) return;
        const body = toAddOfferRequest(f.data, buyer.product);
        await ws.run(async () => {
          const created = await call<unknown>(
            "POST",
            `/trade-opportunities/${ws.opp.id}/offers`,
            body,
          );
          const id =
            typeof created === "string"
              ? created
              : (created as { id?: string } | undefined)?.id;
          if (f.data.incoterm === "Fob") {
            if (!id)
              throw new Error(
                "Offer saved, but the API returned no id, so ocean freight was not added.",
              );
            await call(
              "PUT",
              `/trade-opportunities/${ws.opp.id}/offers/${id}/route-costs`,
              {
                name: "Ocean Freight",
                category: "Freight",
                amountPerMtUsd: f.data.freight,
              },
            );
          }
        });
        if (!ws.error) {
          open = false;
          form.reset({ data: { qty: buyer.quantityMt } });
        }
      },
    },
  );
  const { form: formData, enhance, submitting } = form;
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="rounded sm:max-w-lg">
    <Dialog.Header
      ><Dialog.Title>Add supplier offer</Dialog.Title><Dialog.Description
        >Product is fixed to the buyer's. The backend prices and ranks it on
        save.</Dialog.Description
      ></Dialog.Header
    >
    {#if !buyer}
      <p class="text-sm text-doa">
        Set the buyer requirement before adding offers.
      </p>
    {:else}
      <form method="POST" use:enhance class="grid grid-cols-2 gap-2">
        <FormField
          {form}
          name="supplierName"
          label="Supplier"
          bind:value={$formData.supplierName}
        />
        <FormField
          {form}
          name="terminal"
          label="Loading terminal"
          bind:value={$formData.terminal}
        />
        <FormField
          {form}
          name="place"
          label="Named place"
          bind:value={$formData.place}
        />
        <FormField
          {form}
          name="incoterm"
          type="select"
          options={incoterms}
          label="Incoterm"
          bind:value={$formData.incoterm}
        />
        <FormField
          {form}
          name="qty"
          type="number"
          label="Quantity, MT"
          bind:value={$formData.qty}
        />
        <FormField
          {form}
          name="density"
          type="number"
          label="Density, kg/L"
          bind:value={$formData.density}
        />
        <FormField
          {form}
          name="price"
          type="number"
          label="Price, $/MT"
          bind:value={$formData.price}
        />
        <FormField
          {form}
          name="loss"
          type="number"
          label="Transit loss, %"
          bind:value={$formData.loss}
        />
        <FormField
          {form}
          name="transit"
          type="number"
          label="Transit days"
          bind:value={$formData.transit}
        />
        {#if $formData.incoterm === "Fob"}<FormField
            {form}
            name="freight"
            type="number"
            label="Ocean freight, $/MT"
            hint="Needed to bridge FOB to the buyer's terms"
            bind:value={$formData.freight}
          />{/if}
        <FormField
          {form}
          name="laycanStart"
          type="date"
          label="Laycan start"
          bind:value={$formData.laycanStart}
        />
        <FormField
          {form}
          name="laycanEnd"
          type="date"
          label="Laycan end"
          bind:value={$formData.laycanEnd}
        />
        {#if ws.error}<p
            class="col-span-2 whitespace-pre-line text-xs text-doa"
            role="alert"
          >
            {ws.error}
          </p>{/if}
        <SubmitButton class="col-span-2" busy={$submitting || ws.busy}
          >Add offer</SubmitButton
        >
      </form>{/if}
  </Dialog.Content>
</Dialog.Root>
