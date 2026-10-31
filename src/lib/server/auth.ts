import {
  AUTH_REDIRECT_BASE_URL,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_CLIENT_SECRET,
  KEYCLOAK_ISSUER_URL,
} from "$app/env/private";
import { send } from "#lib/server/api.js";
import { cookieSecure, type SignedInUser } from "#lib/server/session.js";
import type { Cookies } from "@sveltejs/kit";

/** Everything the login flow can fail with, mapped to a `?error=` code on /login. */
export type AuthFailure = "config" | "idp" | "profile" | "audience";

export class AuthError extends Error {
  constructor(
    readonly failure: AuthFailure,
    message: string,
  ) {
    super(message);
  }
}

type Discovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint?: string;
};

// Keycloak's endpoints are static per realm, so one lookup per process is enough. A bad value is
// only re-fetched after the next failure, never cached as a success.
let discovery: Discovery | undefined;

async function discover(): Promise<Discovery> {
  if (discovery) return discovery;
  const res = await fetch(`${KEYCLOAK_ISSUER_URL}/.well-known/openid-configuration`);
  if (!res.ok) throw new AuthError("idp", `Discovery failed (${res.status})`);
  discovery = (await res.json()) as Discovery;
  return discovery;
}

const base64url = (bytes: Uint8Array) => {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

// Web Crypto, not node:crypto: this project has no @types/node, so node's crypto does not
// type-check under `npm run check`.
const randomToken = (byteLength: number) => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
};

export async function createPkce() {
  const verifier = randomToken(32);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return { verifier, challenge: base64url(new Uint8Array(digest)) };
}

export const createState = () => randomToken(24);

/**
 * Where sign-in should land. Anything that is not a same-origin path — `//evil.example`,
 * `https://evil.example`, `javascript:…` — is dropped rather than redirected to.
 */
export function safeNext(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return undefined;
  return raw;
}

export const AUTHFLOW_COOKIE = "authflow";

export type AuthFlow = { verifier: string; state: string; next: string | undefined };

// Scoped to /callback and short-lived: it only has to survive one round trip through Keycloak.
export function writeAuthFlow(cookies: Cookies, flow: AuthFlow) {
  cookies.set(AUTHFLOW_COOKIE, JSON.stringify(flow), {
    path: "/callback",
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure,
    maxAge: 600,
  });
}

export function readAuthFlow(cookies: Cookies): AuthFlow | undefined {
  const raw = cookies.get(AUTHFLOW_COOKIE);
  if (!raw) return undefined;
  try {
    const flow = JSON.parse(raw) as AuthFlow;
    return typeof flow?.verifier === "string" && typeof flow?.state === "string"
      ? flow
      : undefined;
  } catch {
    return undefined;
  }
}

export function clearAuthFlow(cookies: Cookies) {
  cookies.delete(AUTHFLOW_COOKIE, { path: "/callback" });
}

/** Same origin the desk reaches the app on, so Keycloak redirects back to *this* server. */
export const redirectUri = `${AUTH_REDIRECT_BASE_URL.replace(/\/$/, "")}/callback`;

export async function authorizationUrl(state: string, challenge: string): Promise<string> {
  if (!KEYCLOAK_CLIENT_SECRET)
    throw new AuthError("config", "KEYCLOAK_CLIENT_SECRET is not set");
  const { authorization_endpoint } = await discover();
  const query = new URLSearchParams({
    response_type: "code",
    client_id: KEYCLOAK_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "openid profile email",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${authorization_endpoint}?${query}`;
}

export type Tokens = { accessToken: string; idToken?: string; expiresIn: number };

export async function exchangeCode(code: string, verifier: string): Promise<Tokens> {
  const { token_endpoint } = await discover();
  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: KEYCLOAK_CLIENT_ID,
      client_secret: KEYCLOAK_CLIENT_SECRET ?? "",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new AuthError("idp", `Token exchange failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const t = await res.json();
  if (!t.access_token) throw new AuthError("idp", "Token response had no access_token");
  return {
    accessToken: t.access_token as string,
    idToken: t.id_token as string | undefined,
    expiresIn: typeof t.expires_in === "number" ? t.expires_in : 3600,
  };
}

type JwtClaims = {
  sub?: unknown;
  email?: unknown;
  given_name?: unknown;
  family_name?: unknown;
  exp?: unknown;
};

/**
 * Payload of an access token, read without checking the signature. Only ever called with a token this
 * process fetched server-to-server — from Keycloak's token endpoint or from `API_BASE_URL`. The path a
 * signature check defends against is the browser supplying a token, and the browser never holds one.
 */
function decodeJwtPayload(accessToken: string): JwtClaims {
  const segment = accessToken.split(".")[1];
  if (!segment) throw new AuthError("idp", "access token had no payload");
  const base64 = segment.replaceAll("-", "+").replaceAll("_", "/");
  return JSON.parse(
    atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")),
  ) as JwtClaims;
}

/**
 * The session's lifetime, read off the access token. `/users/login` answers with the token alone —
 * `AccessTokenResponse` carries no `expires_in` — so the cookie's `maxAge` comes from the `exp` claim
 * the server just received from the issuer. Unparseable is treated as "an hour", never as a refusal:
 * a session that outlives its token fails on the next request with a clean 401, which is better than
 * turning away a valid password over a decoding quirk.
 */
export function tokenLifetimeSeconds(accessToken: string): number {
  let claims: JwtClaims;
  try {
    claims = decodeJwtPayload(accessToken);
  } catch {
    return 3600;
  }
  if (typeof claims.exp !== "number") return 3600;
  return Math.max(60, claims.exp - Math.floor(Date.now() / 1000));
}

/**
 * Identity for the password grant, where `userinfo` cannot be used. The API mints that token through
 * Keycloak's container address, so it says `iss=http://identity:8080/realms/trade-envelope` while this
 * process discovers Keycloak at `http://localhost:18080/...` — and `userinfo` rejects the mismatch with
 * `invalid_token`, even though the API itself lists both issuers as valid. The claims are the same ones
 * `userinfo` would have returned, so they are read off the token instead of fetched back from the
 * issuer. Align `Identity:TokenUrl` with the public issuer and this function can go.
 */
export function getIdentityFromAccessToken(accessToken: string): SignedInUser {
  const c = decodeJwtPayload(accessToken);
  const user: SignedInUser = {
    identityId: c.sub as string,
    email: c.email as string,
    firstName: c.given_name as string,
    lastName: c.family_name as string,
  };
  if (!user.identityId) throw new AuthError("idp", "access token had no sub");
  return user;
}

/**
 * Identity comes from `userinfo`, not from validating the `id_token`: the access token arrived
 * server-to-server straight from the issuer, so the attacks id_token validation defends against
 * (forged or replayed tokens crossing the browser) do not apply here. If that ever changes, this is
 * the single function to replace.
 */
export async function getUserIdentity(accessToken: string): Promise<SignedInUser> {
  const { userinfo_endpoint } = await discover();
  const res = await fetch(userinfo_endpoint, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new AuthError("idp", `userinfo failed (${res.status})`);
  const c = await res.json();
  const user: SignedInUser = {
    identityId: c.sub,
    email: c.email,
    firstName: c.given_name,
    lastName: c.family_name,
  };
  if (!user.identityId) throw new AuthError("idp", "userinfo had no sub");
  return user;
}

/**
 * Provisions the `Domain/Users` row the API's claims transformation reads. Called with the session
 * already created, because the call carries the bearer through the same `forward()` as every other
 * API request.
 */
export async function provisionUser(
  f: typeof fetch,
  cookies: Cookies,
  user: SignedInUser,
): Promise<void> {
  let r;
  try {
    r = await send(f, cookies, "POST", "/users/register", {});
  } catch (err) {
    // The API being unreachable is not a reason to refuse a valid login: the row is created on the
    // next sign-in, and the app's own error page reports the outage better than /login would.
    console.warn("users/register unreachable", err);
    return;
  }
  if (r.ok) return;
  if (r.status === 400) throw new AuthError("profile", r.message);
  // 401/403 here means the token failed the API's validation: almost always the `aud` claim does not
  // contain the audience appsettings pins.
  if (r.status === 401 || r.status === 403) throw new AuthError("audience", r.message);
  console.warn(`users/register -> ${r.status} ${r.message}`);
}

export async function endSessionUrl(
  idToken: string | undefined,
): Promise<string | undefined> {
  const { end_session_endpoint } = await discover();
  if (!end_session_endpoint) return undefined;
  const query = new URLSearchParams({
    post_logout_redirect_uri: `${AUTH_REDIRECT_BASE_URL.replace(/\/$/, "")}/login`,
    client_id: KEYCLOAK_CLIENT_ID,
  });
  if (idToken) query.set("id_token_hint", idToken);
  return `${end_session_endpoint}?${query}`;
}
