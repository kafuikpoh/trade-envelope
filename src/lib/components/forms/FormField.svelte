<script lang="ts">
  // One field = shadcn-svelte's Form anatomy: Field > Control > (Label + input) + Description + FieldErrors.
  import * as Form from "#lib/components/ui/form/index.js";
  import { Input } from "#lib/components/ui/input/index.js";
  import { Label } from "#lib/components/ui/label/index.js";
  import * as Select from "#lib/components/ui/select/index.js";
  import type { SuperForm } from "sveltekit-superforms";
  import { Checkbox } from "#lib/components/ui/checkbox/index.ts";

  type Props = {
    form: SuperForm<any>;
    name: string;
    label: string;
    hint?: string;
    value?: any;
    list?: string;
    hideLabel?: boolean;
    placeholder?: string;
    type?:
      | "text"
      | "number"
      | "date"
      | "email"
      | "password"
      | "select"
      | "checkbox";
    options?: [string, string][];
    class?: string;
  };

  let {
    form,
    name,
    label,
    hint,
    value = $bindable(),
    list,
    hideLabel = false,
    placeholder = "Select…",
    type = "text",
    options = [],
    class: cls = "",
  }: Props = $props();

  const shown = $derived(options.find(([v]) => v === value)?.[1]);
  // Same size as shadcn's Input (text-base on mobile, text-sm from md), so a select reads like its neighbours.
  const text = "text-base md:text-sm";
</script>

<Form.Field {form} {name}>
  <Form.Control>
    {#snippet children({ props })}
      {#if type === "checkbox"}
        <div class="flex items-center gap-2">
          <Checkbox {...props} bind:checked={value} /><Label
            for={props.id}
            class="text-xs">{label}</Label
          >
        </div>
      {:else}
        <Label
          for={props.id}
          class="text-xs text-muted-foreground {hideLabel ? 'sr-only' : ''}"
          >{label}</Label
        >
        {#if type === "select"}
          <Select.Root type="single" bind:value name={props.name}>
            <Select.Trigger
              {...props}
              class="mt-0.5 h-7 w-full px-2 {text} data-[size=default]:h-7 {cls}"
              >{shown ?? placeholder}</Select.Trigger
            >
            <Select.Content
              >{#each options as [v, t] (v)}<Select.Item
                  value={v}
                  label={t}
                  class={text}
                />{/each}</Select.Content
            >
          </Select.Root>
        {:else}
          <Input
            {...props}
            {type}
            {list}
            step={type === "number" ? "any" : undefined}
            class="mt-0.5 h-7 {type === 'number'
              ? 'num text-right'
              : ''} {type === 'date' ? 'num px-1' : ''} {cls}"
            bind:value
          />
        {/if}
      {/if}
    {/snippet}
  </Form.Control>
  {#if hint}<Form.Description class="text-xs">{hint}</Form.Description>{/if}
  <Form.FieldErrors class="animate-in fade-in text-xs duration-150" />
</Form.Field>
