<script lang="ts">
  let {
    kind,
    children,
  }: { kind: "viable" | "tight" | "doa" | "desk"; children: any } = $props();
  const s = {
    viable: "bg-viable-bg text-viable border-viable-bd",
    tight: "bg-tight-bg text-tight border-tight-bd",
    doa: "bg-doa-bg text-doa border-doa-bd",
    desk: "bg-accent text-primary border-[#BFDBFE]",
  };
</script>

<span
  class="inline-flex h-[18px] items-center rounded-sm border px-1.5 font-mono text-[10px] font-semibold {s[
    kind
  ]}">{@render children()}</span
>
