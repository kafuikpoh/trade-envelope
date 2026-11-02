import {
  AUTH_REDIRECT_BASE_URL,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_ISSUER_URL,
} from "$app/env/private";
import {
  None,
  allowInsecureRequests,
  authorizationCodeGrant,
  buildAuthorizationUrl,
  buildEndSessionUrl,
  calculatePKCECodeChallenge,
  discovery,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
  refreshTokenGrant,
  type Configuration,
  type IDToken,
  type TokenEndpointResponse,
  type TokenEndpointResponseHelpers,
} from "openid-client";
import type { Cookies } from "@sveltejs/kit";
import type { SignedInUser } from "#lib/server/session.js";

/**
 * Everything sign-in can fail with, mapped to a `?error=` code on /login.
 *
 * `expired` is the one that matters for the API layer: it means "the session you hold is no good", and
 * only ever comes from a rejected refresh, never from a failed sign-in attempt.
 */
export type AuthFailure = "config" | "idp" | "profile" | "audience" | "expired";

export class AuthError extends Error {
  constructor(
    readonly failure: AuthFailure,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Externally reachable origin of this app, so Keycloak sends the desk back to *this* server. `/callback`
 * is an exact redirect URI: a wildcard would let any path on the origin receive the authorisation code.
 */
export const redirectUri = `${AUTH_REDIRECT_BASE_URL.replace(/\/$/, "")}/callback`;

export const postLogoutRedirectUri = `${AUTH_REDIRECT_BASE_URL.replace(/\/$/, "")}/login`;

/** `profile` and `email` are what `SignedInUser` is made of; nothing else is asked for. */
const scope = "openid profile email";

let configPromise: Promise<Configuration> | undefined;

/**
 * One discovery per process, and a failure is never cached: a realm that was briefly unreachable must be
 * re-read on the next sign-in rather than parked as an error for the life of the process.
 */
export function getConfig(): Promise<Configuration> {
  configPromise ??= discover().catch((e) => {
    configPromise = undefined;
    throw toAuthError(e);
  });
  return configPromise;
}

async function discover(): Promise<Configuration> {
  const issuer = new URL(KEYCLOAK_ISSUER_URL);
  return discovery(
    issuer,
    KEYCLOAK_CLIENT_ID,
    {
      redirect_uris: [redirectUri],
      response_types: ["code"],
      application_type: "web",
      // Public client: no secret exists for it, so the token endpoint is called unauthenticated and the
      // authorisation code is bound to this process by the PKCE verifier alone.
      token_endpoint_auth_method: "none",
      id_token_signed_response_alg: "RS256",
    },
    None(),
    // The relaxation has to be handed *to* discovery, not applied after it: the library refuses to make the
    // http discovery request itself, so there is no Configuration to relax yet. Only the transport checks
    // are lifted — issuer, signature, audience, nonce and expiry stay enforced. On an https issuer this
    // argument is empty and nothing is relaxed at all.
    issuer.protocol === "http:" ? { execute: [allowInsecureRequests] } : undefined,
  );
}

export type AuthFlow = {
  verifier: string;
  state: string;
  nonce: string;
  next: string | undefined;
};

/** The pair of things a browser has to carry between /login/start and /callback. */
export type StartedFlow = { authorizeUrl: string; flow: AuthFlow };

export async function startAuthFlow(next: string | undefined): Promise<StartedFlow> {
  const config = await getConfig();
  const verifier = randomPKCECodeVerifier();
  const flow: AuthFlow = {
    verifier,
    state: randomState(),
    nonce: randomNonce(),
    next,
  };
  const authorizeUrl = buildAuthorizationUrl(config, {
    // Spelled out rather than left to be derived: this client has more than one redirect URI registered
    // (this dev server's port, plus any other desk setup), and Keycloak answers 400 for an authorize
    // request that does not name which one the code should come back to.
    redirect_uri: redirectUri,
    scope,
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: await calculatePKCECodeChallenge(verifier),
    code_challenge_method: "S256",
  }).toString();
  return { authorizeUrl, flow };
}

/** Tokens as the session store wants them, with both lifetimes reduced to absolute deadlines. */
export type Granted = {
  accessToken: string;
  accessTokenExpiresAtMs: number;
  refreshToken: string | undefined;
  refreshTokenExpiresAtMs: number | undefined;
  idToken: string | undefined;
};

function grant(
  tokens: TokenEndpointResponse & TokenEndpointResponseHelpers,
): Granted {
  const now = Date.now();
  const refreshExpiresIn = refreshExpiresInSeconds(tokens);
  return {
    accessToken: tokens.access_token,
    // A missing `expires_in` would make the session live forever, which is the wrong direction to err in.
    accessTokenExpiresAtMs: now + (tokens.expiresIn() ?? 300) * 1000,
    refreshToken: tokens.refresh_token,
    refreshTokenExpiresAtMs:
      refreshExpiresIn === undefined ? undefined : now + refreshExpiresIn * 1000,
    idToken: tokens.id_token,
  };
}

/**
 * Keycloak answers with `refresh_expires_in` beside `expires_in`. It is not part of the typed OIDC token
 * response, so it is read off the body; without it the session simply has no local deadline for the
 * refresh token and finds out from the provider instead.
 */
function refreshExpiresInSeconds(tokens: TokenEndpointResponse): number | undefined {
  const raw = (tokens as { refresh_expires_in?: unknown }).refresh_expires_in;
  return typeof raw === "number" ? raw : undefined;
}

/**
 * The end of the redirect. `authorizationCodeGrant` validates the response's `state`, redeems the code
 * with the verifier, then checks the `id_token` locally against the discovered JWKS: signature, issuer,
 * audience, expiry, nonce and the `sub`/`at_hash` binding to the access token. Nothing is introspected
 * per call, and nothing about the token is trusted that the signature does not carry.
 */
export async function completeAuthFlow(
  request: Request,
  flow: AuthFlow,
): Promise<{ granted: Granted; user: SignedInUser }> {
  const config = await getConfig();
  let tokens: TokenEndpointResponse & TokenEndpointResponseHelpers;
  try {
    tokens = await authorizationCodeGrant(config, request, {
      expectedState: flow.state,
      expectedNonce: flow.nonce,
      pkceCodeVerifier: flow.verifier,
    });
  } catch (e) {
    throw toAuthError(e);
  }
  return { granted: grant(tokens), user: userFromIdToken(tokens.claims()) };
}

/**
 * A refresh token is single-use the moment the provider rotates it, so a rejected one is terminal: the
 * caller signs the session out instead of trying again.
 */
export async function refresh(refreshToken: string): Promise<Granted> {
  const config = await getConfig();
  try {
    return grant(await refreshTokenGrant(config, refreshToken));
  } catch (e) {
    throw toAuthError(e);
  }
}

/**
 * Only the claims `SignedInUser` needs. They come from the validated `id_token`, not from `userinfo` and
 * not from decoding the access token: the older password path had to read the access token because the
 * issuer rejects a token minted through the container address, and that reason dies with the grant.
 */
function userFromIdToken(claims: IDToken | undefined): SignedInUser {
  const identityId = claims?.sub;
  // Typed as JSON values rather than strings, because a claim is whatever the provider put in it.
  const email = typeof claims?.email === "string" ? claims.email : undefined;
  const firstName =
    typeof claims?.given_name === "string" ? claims.given_name : undefined;
  const lastName =
    typeof claims?.family_name === "string" ? claims.family_name : undefined;
  if (!identityId) throw new AuthError("idp", "id_token had no sub");
  if (!email || !firstName || !lastName) {
    const missing = [
      !email && "email",
      !firstName && "given_name",
      !lastName && "family_name",
    ].filter(Boolean);
    throw new AuthError(
      "profile",
      `id_token is missing ${missing.join(", ")} — attach the profile and email client scopes to the client`,
    );
  }
  return { identityId, email, firstName, lastName };
}

/**
 * The provider's `error` code, when the failure is an OAuth error response. Reading only this field is
 * deliberate: a malformed *success* body can carry a token, and the message below is written to the log.
 */
function oauthErrorCode(e: unknown): string | undefined {
  const cause = (e as { cause?: unknown })?.cause;
  if (cause && typeof cause === "object" && "error" in cause) {
    const error = (cause as { error?: unknown }).error;
    if (typeof error === "string") return error;
  }
  return undefined;
}

export function toAuthError(e: unknown): AuthError {
  if (e instanceof AuthError) return e;
  const code = oauthErrorCode(e);
  // invalid_grant on a refresh means the provider will not exchange this token any more: expired, not
  // broken. Anything else the provider says is an outage or a contract problem, reported as `idp`.
  if (code === "invalid_grant" || code === "invalid_client")
    return new AuthError("expired", `provider rejected the token: ${code}`);
  const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  return new AuthError("idp", detail);
}

/**
 * Where sign-in should land. Anything that is not a same-origin path — `//evil.example`,
 * `https://evil.example`, `javascript:…` — is dropped rather than redirected to.
 */
export function safeNext(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\"))
    return undefined;
  return raw;
}

export const AUTHFLOW_COOKIE = "authflow";

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
    return typeof flow?.verifier === "string" &&
      typeof flow?.state === "string" &&
      typeof flow?.nonce === "string"
      ? flow
      : undefined;
  } catch {
    return undefined;
  }
}

export function clearAuthFlow(cookies: Cookies) {
  cookies.delete(AUTHFLOW_COOKIE, { path: "/callback" });
}

export async function endSessionUrl(idToken: string | undefined): Promise<string> {
  const config = await getConfig();
  const query: Record<string, string> = {
    post_logout_redirect_uri: postLogoutRedirectUri,
  };
  if (idToken) query.id_token_hint = idToken;
  return buildEndSessionUrl(config, query).toString();
}

// Derived, never hardcoded: localhost runs over http, a real deployment over https.
export const cookieSecure =
  new URL(AUTH_REDIRECT_BASE_URL).protocol === "https:";
