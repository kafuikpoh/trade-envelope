<script lang="ts">
  import { Button } from "../../../lib/components/ui/button";
  import * as Card from "../../../lib/components/ui/card";
  import { Input } from "../../../lib/components/ui/input";
  import { Label } from "../../../lib/components/ui/label";

  let { form } = $props();
</script>

<Card.Root class="rounded shadow-none">
  <Card.Header class="border-b p-3"
    ><Card.Title>Sign in to your desk</Card.Title></Card.Header
  >
  <form method="POST" class="space-y-3 p-3">
    <div>
      <Label for="email">Email</Label><Input
        id="email"
        name="email"
        type="email"
        required
        class="mt-1 h-8"
      />
    </div>
    <div>
      <Label for="pw">Password</Label><Input
        id="pw"
        name="password"
        type="password"
        class="mt-1 h-8"
      />
    </div>
    {#if form?.error}<p class="text-xs text-doa" role="alert">
        {form.error}
      </p>{/if}
    <Button type="submit" class="w-full">Sign in</Button>
    <Button
      type="submit"
      name="magic"
      value="1"
      variant="outline"
      class="w-full">Email me a magic link</Button
    >
    <p class="text-xs text-muted-foreground">
      No account? <a class="text-primary" href="/register">Register your desk</a
      >
      · <a class="text-primary" href="/reset-password">Reset password</a>
    </p>
  </form>
</Card.Root>
