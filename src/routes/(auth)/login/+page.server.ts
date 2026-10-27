import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const d = await request.formData();
    const email = String(d.get("email") ?? "");
    // TODO: call .NET 9 API /auth/login (or /auth/magic-link when d.get('magic'))
    const res = { ok: !!email, token: "TODO" };
    if (!res.ok)
      return fail(400, {
        error: "Check your email and password, then try again.",
      });
    cookies.set("session", res.token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 12,
    });
    redirect(303, "/trades");
  },
};
