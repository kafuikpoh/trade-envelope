import {
  AuthError,
  cookieSecure,
  refresh,
  type Granted,
} from "#lib/server/auth.js";
import type { Cookies } from "@sveltejs/kit";

export type SignedInUser = {
  identityId: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type Session = {
  id: string;
  user: SignedInUser;
  accessToken: string;
  accessTokenExpiresAtMs: number;
  /** Absent when the provider issued none, and then the session ends with its access token. */
  refreshToken: string | undefined;
  refreshTokenExpiresAtMs: number | undefined;
  /** Only ever used to tell the provider which browser session to end. */
  idToken: string | undefined;
  /** When the desk is signed out for good: the later of the two token deadlines. */
  expiresAtMs: number;
};

export const SESSION_COOKIE = "session";

// In-memory and single-process: an API restart or a redeploy signs every desk out, and two Node
// instances would not share sessions. Swap this Map for Redis or a table before running more than
// one process.
const store = new Map<string, Session>();

// A bearer is replaced before it dies, so a request never carries a token the API is about to reject.
const REFRESH_SKEW_MS = 30_000;

// Exchanging a refresh token twice in parallel either loses a rotation or trips the provider's reuse
// detection, and a page load fires several requests at once.
const refreshing = new Map<string, Promise<void>>();

const deadline = (granted: Granted): number =>
  Math.max(
    granted.accessTokenExpiresAtMs,
    granted.refreshTokenExpiresAtMs ?? granted.accessTokenExpiresAtMs,
  );

function writeSessionCookie(cookies: Cookies, session: Session) {
  cookies.set(SESSION_COOKIE, session.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure,
    maxAge: Math.ceil((session.expiresAtMs - Date.now()) / 1000),
  });
}

export function signIn(
  cookies: Cookies,
  user: SignedInUser,
  granted: Granted,
): Session {
  const session: Session = {
    id: crypto.randomUUID(),
    user,
    ...granted,
    expiresAtMs: deadline(granted),
  };
  store.set(session.id, session);
  writeSessionCookie(cookies, session);
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
  if (id) {
    store.delete(id);
    refreshing.delete(id);
  }
  cookies.delete(SESSION_COOKIE, { path: "/" });
  return session;
}

/**
 * The bearer for the next API call, refreshed if it is close to expiry, and `undefined` when this session
 * cannot produce a usable one — which is what a signed-out desk looks like to every caller here.
 *
 * `force` is for the response side: the API has just rejected a token this process believed was valid, so
 * the token's stated lifetime is no longer information worth acting on, and the refresh happens regardless.
 */
export async function getAccessToken(
  cookies: Cookies,
  force = false,
): Promise<string | undefined> {
  const session = readSession(cookies);
  if (!session) return undefined;

  if (!force && Date.now() < session.accessTokenExpiresAtMs - REFRESH_SKEW_MS)
    return session.accessToken;

  if (!canRefresh(session)) {
    // Nothing can renew it: report it signed out rather than spending a call on a known-dead bearer.
    return undefined;
  }

  // One refresh per session at a time. A caller forcing a refresh onto one already running waits for it
  // instead of spending a second exchange on the token that is being replaced.
  let pending = refreshing.get(session.id);
  if (!pending) {
    pending = renew(session, cookies).finally(() => refreshing.delete(session.id));
    refreshing.set(session.id, pending);
  }
  await pending;

  return readSession(cookies)?.accessToken;
}

function canRefresh(session: Session): boolean {
  return (
    !!session.refreshToken &&
    (session.refreshTokenExpiresAtMs === undefined ||
      session.refreshTokenExpiresAtMs > Date.now())
  );
}

async function renew(session: Session, cookies: Cookies): Promise<void> {
  try {
    const granted = await refresh(session.refreshToken as string);
    apply(session, granted, cookies);
  } catch (e) {
    if (e instanceof AuthError && e.failure === "expired") {
      // A rejected refresh token is terminal: reusing one that was already rotated is how providers
      // detect theft, and the answer is to sign out, not to try the token again.
      signOut(cookies);
      return;
    }
    // The provider being unreachable is not the desk being signed out: keep the session and let the
    // request fail on its own terms.
    console.warn("refreshing the session failed", e instanceof Error ? e.message : e);
  }
}

function apply(session: Session, granted: Granted, cookies: Cookies) {
  session.accessToken = granted.accessToken;
  session.accessTokenExpiresAtMs = granted.accessTokenExpiresAtMs;
  session.refreshToken = granted.refreshToken ?? session.refreshToken;
  session.refreshTokenExpiresAtMs = granted.refreshTokenExpiresAtMs;
  session.idToken = granted.idToken ?? session.idToken;
  session.expiresAtMs = deadline(granted);
  writeSessionCookie(cookies, session);
}
