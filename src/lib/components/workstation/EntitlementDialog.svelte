<script lang="ts">
  import SubmitButton from "./SubmitButton.svelte";
  import { defaults, superForm } from "sveltekit-superforms";
  import { zod4 } from "sveltekit-superforms/adapters";
  import { z } from "zod";
  import * as Dialog from "#lib/components/ui/dialog/index.js";
  import FormField from "#lib/components/forms/FormField.svelte";
  import { EntitlementRequest } from "#lib/api/schemas.js";
  import type { Workstation } from "#lib/workstation.svelte.js";

  let {
    ws,
    side,
    open = $bindable(false),
  }: { ws: Workstation; side: "Buyer" | "Seller"; open: boolean } = $props();

  const Schema = EntitlementRequest.omit({ side: true });

  const form = superForm(defaults(zod4(Schema)), {
    SPA: true,
    validators: zod4(Schema),
    resetForm: true,
    onUpdate: async ({ form: f }) => {
      if (!f.valid || !ws.agreement) return;
      await ws.run({
        method: "POST",
        path: `/fee-agreements/${ws.agreement.id}/entitlements`,
        body: { side, ...f.data },
        success: "Entitlement added",
      });
      if (!ws.error) open = false;
    },
  });
  const { form: d, enhance, submitting } = form;
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="rounded sm:max-w-md">
    <Dialog.Header
      ><Dialog.Title>Add {side.toLowerCase()}-side entitlement</Dialog.Title
      ><Dialog.Description
        >An entitlement larger than what is left on this side is rejected.</Dialog.Description
      ></Dialog.Header
    >
    <form method="POST" use:enhance class="grid grid-cols-2 gap-2">
      <FormField
        {form}
        name="participantName"
        label="Participant"
        bind:value={$d.participantName}
      />
      <FormField
        {form}
        name="rateUsdPerMt"
        type="number"
        label="Rate, $/MT"
        bind:value={$d.rateUsdPerMt}
      />
      <div class="col-span-2">
        <FormField
          {form}
          name="isSelf"
          type="checkbox"
          label="This is my own share"
          bind:value={$d.isSelf}
        />
      </div>
      {#if ws.error}<p
          class="col-span-2 whitespace-pre-line text-xs text-doa"
          role="alert"
        >
          {ws.error}
        </p>{/if}
      <SubmitButton class="col-span-2" busy={$submitting || ws.busy}
        >Add entitlement</SubmitButton
      >
    </form>
  </Dialog.Content>
</Dialog.Root>
