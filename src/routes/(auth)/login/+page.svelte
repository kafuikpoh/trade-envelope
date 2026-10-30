<script lang="ts">
  import { Button } from "#lib/components/ui/button/index.js";
  import * as Card from "#lib/components/ui/card/index.js";

  const COPY: Record<string, string> = {
    expired: "Your sign-in is no longer valid. Sign in again to carry on.",
    idp: "Your identity provider rejected the sign-in. Try again, and if it keeps happening tell whoever runs your desk account.",
    profile:
      "Your account has no email, first name or last name set, so we could not create your desk record.",
    audience:
      "The trade API did not accept your sign-in token — the token audience does not match what the API expects.",
    config: "Sign-in is not configured on this server yet.",
  };

  let { data } = $props();
  const message = $derived(
    data.error ? (COPY[data.error] ?? "We could not sign you in.") : undefined,
  );
  const start = $derived(
    `/login/start${data.next ? `?next=${encodeURIComponent(data.next)}` : ""}`,
  );
</script>

<Card.Root class="rounded shadow-none">
  <Card.Header class="border-b p-3"
    ><Card.Title>Sign in to your desk</Card.Title></Card.Header
  >
  <div class="space-y-3 p-3">
    {#if message}
      <p class="text-xs text-doa" role="alert">{message}</p>
    {/if}
    <Button href={start} class="w-full">Sign in with your desk account</Button>
    <p class="text-xs text-muted-foreground">
      You will be redirected to your identity provider, then straight back here.
    </p>
    <p class="text-xs text-muted-foreground">
      No account? <a class="text-primary" href="/register">Register your desk</a>
      · <a class="text-primary" href="/reset-password">Reset password</a>
    </p>
  </div>
</Card.Root>
