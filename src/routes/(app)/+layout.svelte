<script lang="ts">
  import { Button } from "#lib/components/ui/button/index.js";
  import Logo from "#lib/components/brand/Logo.svelte";
  import NewDealButton from "#lib/components/workstation/NewDealButton.svelte";
  import { Toaster } from "#lib/components/ui/sonner/index.js";

  let { children, data } = $props();
  // TODO: global hotkeys (N = new deal, G then T = blotter), theme toggle (mode-watcher)
</script>

<header class="flex h-10 items-center justify-between border-b bg-card px-3">
  <a href="/trades" class="flex items-center gap-2 text-sm font-semibold"
    ><Logo variant="mark" height={20} decorative />TradeEnvelope</a
  >
  <nav class="flex items-center gap-2">
    <NewDealButton />
    <Button
      href="/settings"
      variant="outline"
      size="sm"
      class="h-7">Settings</Button
    >
    {#if data.user}
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground" title={data.user.email}
          >{data.user.name}</span
        >
        <form method="POST" action="/logout" class="contents">
          <Button variant="outline" size="sm" type="submit" class="h-7"
            >Sign out</Button
          >
        </form>
      </div>
    {/if}
  </nav>
</header>
<main class="p-3">{@render children()}</main>
<Toaster position="bottom-right" />
