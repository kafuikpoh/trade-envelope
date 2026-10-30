import { AUTH_REDIRECT_BASE_URL } from "$app/env/private";
import type { Cookies } from "@sveltejs/kit";

export type SignedInUser = {
  identityId: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type Session = {
  id: string;
  accessToken: string;
  idToken: string | undefined;
  expiresAtMs: number;
  user: SignedInUser;
};

export const SESSION_COOKIE = "session";

// In-memory and single-process: an API restart or a redeploy signs every desk out, and two Node
// instances would not share sessions. Swap this Map for Redis or a table before running more than
// one process.
const store = new Map<string, Session>();

// Derived, never hardcoded: localhost runs over http, a real deployment over https.
export const cookieSecure = new URL(AUTH_REDIRECT_BASE_URL).protocol === "https:";

export function signIn(
  cookies: Cookies,
  user: SignedInUser,
  accessToken: string,
  idToken: string | undefined,
  expiresIn: number,
): Session {
  const session: Session = {
    id: crypto.randomUUID(),
    accessToken,
    idToken,
    expiresAtMs: Date.now() + expiresIn * 1000,
    user,
  };
  store.set(session.id, session);
  cookies.set(SESSION_COOKIE, session.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure,
    maxAge: expiresIn,
  });
  return session;
}

export function readSession(cookies: Cookies): Session | undefined {
  const id = cookies.get(SESSION_COOKIE);
  if (!id) return undefined;
  const session = store.get(id);
  if (!session) return undefined;
  if (session.expiresAtMs <= Date.now()) {
    signOut(cookies);
    return undefined;
  }
  return session;
}

export function signOut(cookies: Cookies): Session | undefined {
  const id = cookies.get(SESSION_COOKIE);
  const session = id ? store.get(id) : undefined;
  if (id) store.delete(id);
  cookies.delete(SESSION_COOKIE, { path: "/" });
  return session;
}
