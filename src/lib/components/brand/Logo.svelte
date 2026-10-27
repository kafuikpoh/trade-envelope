<script lang="ts">
  import { asset } from "$app/paths";

  type Variant = "horizontal" | "mark" | "color" | "lockup";

  // Asset path, intrinsic width, intrinsic height
  const files: Record<Variant, [string, number, number]> = {
    horizontal: [asset("brand/logo-horizontal.png"), 646, 112],
    mark: [asset("brand/mark-black.png"), 150, 128],
    color: [asset("brand/mark-color.png"), 301, 256],
    lockup: [asset("brand/lockup-color.png"), 683, 224],
  };

  let {
    variant = "horizontal",
    height = 28,
    decorative = false,
    class: cls = "",
  }: {
    variant?: Variant;
    height?: number;
    decorative?: boolean;
    class?: string;
  } = $props();

  const f = $derived(files[variant]);
</script>

<img
src={f[0]}
alt={decorative ? "" : "TradeEnvelope"}
width={Math.round((f[1] * height) / f[2])}
{height}
class={cls}
/>
