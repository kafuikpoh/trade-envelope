<script lang="ts">
  import { Button } from "../ui/button";
  import * as Card from "../ui/card";

  const plans = [
    {
      name: "Solo broker",
      price: 49,
      note: "For individual intermediaries",
      cta: "Start 14-day solo trial",
      href: "/register?plan=solo",
      items: [
        "Unlimited trade analyses and saved deals",
        "Ranked multi-offer comparison",
        "Teaser and Audit PDF export",
        "Full ASTM density library",
        "Presentation mode for screen-sharing",
      ],
    },
    {
      name: "Brokerage desk",
      price: 149,
      note: "For trading desks and mandate teams",
      cta: "Start desk trial",
      href: "/register?plan=desk",
      items: [
        "Everything in Solo",
        "Shared trade blotter for the whole desk",
        "Multi-tier mandate and sub-broker waterfalls",
        "Custom desk branding on PDFs",
        "Audit blotter and CSV export",
      ],
    },
  ];
</script>

<div class="grid gap-3 md:grid-cols-2">
  {#each plans as p}
    <Card.Root class="rounded shadow-none">
      <Card.Header class="border-b p-3">
        <Card.Title class="text-base">{p.name}</Card.Title>
        <div class="num text-2xl">
          ${p.price}<span class="text-sm text-muted-foreground"> / month</span>
        </div>
        <Card.Description class="text-xs">{p.note}</Card.Description>
      </Card.Header>
      <Card.Content class="p-3">
        <ul class="space-y-1.5 text-sm">
          {#each p.items as it}<li class="flex gap-2">
              <span class="text-viable">✓</span>{it}
            </li>{/each}
        </ul>
      </Card.Content>
      <Card.Footer class="p-3 pt-0"
        ><Button href={p.href} class="w-full">{p.cta}</Button></Card.Footer
      >
    </Card.Root>
  {/each}
</div>
