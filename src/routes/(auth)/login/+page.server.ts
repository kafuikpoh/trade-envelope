import { safeNext } from "#lib/server/auth.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => ({
  error: url.searchParams.get("error") ?? undefined,
  next: safeNext(url.searchParams.get("next")),
});
