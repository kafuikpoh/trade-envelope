import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  const page = Number(url.searchParams.get("page") ?? 1);
  // TODO: GET /trades?page=&pageSize=; return summary aggregates (active, viable, DOA, fees at stake)
  return {
    page,
    trades: [] as {
      id: string;
      ref: string;
      product: string;
      status: "viable" | "tight" | "doa";
      room: number;
    }[],
    summary: { active: 0, viable: 0, doa: 0 },
  };
};
