<script lang="ts">
  let { id, referenceNumber }: { id: string; referenceNumber: string } = $props();
</script>

<a
  href="/trades/{id}"
  class="num text-foreground underline-offset-2 hover:text-primary hover:underline"
  >{referenceNumber}</a
>
