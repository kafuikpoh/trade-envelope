<script lang="ts">
  import Logo from '../../lib/components/brand/Logo.svelte';

  
  let { children } = $props();
</script>

<div class="grid min-h-screen place-items-center bg-background p-3">
  <div class="w-full max-w-sm">
    <a href="/" class="mb-4 flex justify-center" aria-label="TradeEnvelope home"
      ><Logo variant="color" height={48} /></a
    >{@render children()}
  </div>
</div>
