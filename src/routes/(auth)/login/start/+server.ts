import { redirect } from "@sveltejs/kit";
import {
  authorizationUrl,
  AuthError,
  createPkce,
  createState,
  safeNext,
  writeAuthFlow,
} from "#lib/server/auth.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, cookies }) => {
  const { verifier, challenge } = await createPkce();
  const state = createState();
  writeAuthFlow(cookies, {
    verifier,
    state,
    next: safeNext(url.searchParams.get("next")),
  });
  let target: string;
  try {
    target = await authorizationUrl(state, challenge);
  } catch (e) {
    if (e instanceof AuthError) redirect(303, `/login?error=${e.failure}`);
    throw e;
  }
  // The IdP is a different origin, so Kit needs the external flag to let the browser leave.
  redirect(303, target, { external: true });
};
