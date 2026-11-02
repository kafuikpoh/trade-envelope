<script lang="ts">
  import { refreshAll } from "$app/navigation";
  import { Button } from "#lib/components/ui/button/index.js";
  import Logo from "#lib/components/brand/Logo.svelte";
  import NewDealButton from "#lib/components/workstation/NewDealButton.svelte";
  import { Toaster } from "#lib/components/ui/sonner/index.js";

  let { children, data } = $props();

  // The `no-store` set in hooks.server.ts is what keeps Chrome from handing this document back out of its
  // back/forward cache, but that is the browser's choice, not something this app can enforce. A browser that
  // restores anyway fires `pageshow` with `persisted` and never asks the server, so the desk would read a
  // dashboard whose session has ended. Re-run the loaders and let the guard give the real answer.
  $effect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) void refreshAll();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  });
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
