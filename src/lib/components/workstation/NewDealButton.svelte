<script lang="ts">
  import { goto } from "$app/navigation";
  import { defaults, superForm } from "sveltekit-superforms";
  import { zod4 } from "sveltekit-superforms/adapters";
  import * as Dialog from "#lib/components/ui/dialog/index.js";
  import { Button } from "#lib/components/ui/button/index.js";
  import FormField from "#lib/components/forms/FormField.svelte";
  import { call } from "#lib/api/client.js";
  import { CreateOpportunityRequest } from "#lib/api/schemas.js";
  import SubmitButton from "./SubmitButton.svelte";

  let open = $state(false),
    apiError = $state("");

  const form = superForm(defaults(zod4(CreateOpportunityRequest)), {
    SPA: true,
    validators: zod4(CreateOpportunityRequest),
    resetForm: false,
    onUpdate: async ({ form: f }) => {
      if (!f.valid) return;
      apiError = "";
      try {
        const created = await call<unknown>(
          "POST",
          "/trade-opportunities",
          f.data,
        );
        const id =
          typeof created === "string"
            ? created
            : (created as { id?: string } | undefined)?.id;
        if (!id)
          throw new Error("The deal was created but the API returned no id.");
        open = false;
        await goto(`/trades/${id}`);
      } catch (e) {
        apiError = e instanceof Error ? e.message : "Request failed";
      }
    },
  });
  const { form: d, enhance, submitting } = form;
</script>

<Button size="sm" class="h-7" onclick={() => (open = true)}>+ New deal</Button>
<Dialog.Root bind:open>
  <Dialog.Content class="rounded sm:max-w-md">
    <Dialog.Header
      ><Dialog.Title>New deal</Dialog.Title><Dialog.Description
        >Give the deal a reference. You set the buyer requirement and add offers
        in the workstation.</Dialog.Description
      ></Dialog.Header
    >
    <form method="POST" use:enhance class="space-y-3">
      <FormField
        {form}
        name="referenceNumber"
        label="Reference"
        hint="e.g. AGO-2026-001"
        bind:value={$d.referenceNumber}
        class="num"
      />
      <FormField
        {form}
        name="viabilityThresholdUsdPerMt"
        type="number"
        label="Viability threshold, $/MT (optional)"
        hint="Below this margin a deal is a tight margin. Defaults to $2.00"
        bind:value={$d.viabilityThresholdUsdPerMt}
      />
      {#if apiError}<p
          class="whitespace-pre-line text-xs text-doa"
          role="alert"
        >
          {apiError}
        </p>{/if}
      <SubmitButton class="w-full" busy={$submitting}
        >{$submitting ? "Creating…" : "Create and open"}</SubmitButton
      >
    </form>
  </Dialog.Content>
</Dialog.Root>
