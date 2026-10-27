<script lang="ts">
  import Logo from '../../lib/components/brand/Logo.svelte';
  import Button from '../../lib/components/ui/button/button.svelte';

  let { children } = $props();
  const links = [
    ["Features", "/#features"],
    ["The 3 traps", "/#traps"],
    ["Privacy", "/security"],
    ["Pricing", "/pricing"],
  ];
</script>

<header class="sticky top-0 z-10 border-b bg-card">
  <div class="mx-auto flex h-12 max-w-6xl items-center justify-between px-3">
    <a href="/" aria-label="TradeEnvelope home" class="flex items-center gap-3"
      ><Logo height={24} /><span class="col-head hidden sm:inline"
        >RP Workstation</span
      ></a
    >
    <nav
      class="hidden gap-5 text-sm text-muted-foreground md:flex"
      aria-label="Primary"
    >
      {#each links as [t, h]}<a href={h} class="hover:text-foreground">{t}</a
        >{/each}
    </nav>
    <div class="flex gap-2">
      <Button href="/login" variant="outline" size="sm" class="h-7"
        >Sign in</Button
      >
      <Button href="/register" size="sm" class="h-7">Start free trial</Button>
    </div>
  </div>
</header>
<main>{@render children()}</main>
<footer class="mt-16 border-t bg-card">
  <div
    class="mx-auto grid max-w-6xl gap-2 px-3 py-6 text-xs text-muted-foreground"
  >
    <Logo variant="lockup" height={44} />
    <p>Built for physical energy intermediaries worldwide.</p>
    <nav class="flex gap-4" aria-label="Footer">
      <a href="/security">Security charter</a><a href="/terms">Terms</a><a
        href="/login">Sign in</a
      >
    </nav>
    <p class="num">
      All calculation engines operational · Deterministic v1.2 · © 2026
      TradeEnvelope
    </p>
  </div>
</footer>
