<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "#lib/components/ui/button/index.js";
  import * as Card from "#lib/components/ui/card/index.js";
  import { Input } from "#lib/components/ui/input/index.js";
  import { Label } from "#lib/components/ui/label/index.js";

  const COPY: Record<string, string> = {
    expired: "Your sign-in is no longer valid. Sign in again to carry on.",
    credentials: "That email and password do not match.",
    idp: "Your identity provider rejected the sign-in. Try again, and if it keeps happening tell whoever runs your desk account.",
    profile:
      "Your account has no email, first name or last name set, so we could not create your desk record.",
    audience:
      "The trade API did not accept your sign-in token — the token audience does not match what the API expects.",
    config: "Sign-in is not configured on this server yet.",
    fields: "Check the details you typed.",
  };

  let { data, form } = $props();
  const code = $derived(form?.error ?? data.error);
  const message = $derived(
    code ? (COPY[code] ?? "We could not sign you in.") : undefined,
  );
  const start = $derived(
    `/login/start${data.next ? `?next=${encodeURIComponent(data.next)}` : ""}`,
  );
</script>

<Card.Root class="rounded shadow-none">
  <Card.Header class="border-b p-3"
    ><Card.Title>Sign in to your desk</Card.Title></Card.Header
  >
  <form
    class="flex flex-col gap-3 p-3"
    method="POST"
    use:enhance={() => {
      // Keep the default: SvelteKit follows the action's 303 to /trades and invalidates loaders.
      return async () => {};
    }}
  >
    {#if message}
      <p class="text-xs text-doa" role="alert">{message}</p>
    {/if}
    <input type="hidden" name="next" value={data.next ?? ""} />
    <div class="flex flex-col gap-1.5">
      <Label for="email">Email</Label>
      <Input
        id="email"
        name="email"
        type="email"
        autocomplete="username"
        required
        data-invalid={code === "fields" || undefined} />
    </div>
    <div class="flex flex-col gap-1.5">
      <Label for="password">Password</Label>
      <Input
        id="password"
        name="password"
        type="password"
        autocomplete="current-password"
        required
        data-invalid={code === "credentials" || code === "fields" || undefined} />
    </div>
    <Button type="submit" class="w-full">Sign in</Button>
  </form>
  <div class="flex flex-col gap-2 px-3 pb-3">
    {#if data.oidc}
      <p class="text-xs text-muted-foreground">
        Or <a class="text-primary" href={start}>sign in through your identity provider</a>, which keeps
        your password off this server.
      </p>
    {/if}
    <p class="text-xs text-muted-foreground">
      No account? <a class="text-primary" href="/register">Register your desk</a>
      · <a class="text-primary" href="/reset-password">Reset password</a>
    </p>
  </div>
</Card.Root>
