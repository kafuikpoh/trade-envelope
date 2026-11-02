import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
  API_BASE_URL: {
    description: "Base URL of the TradeEnvelope .NET API",
    schema: (value: string | undefined) => value ?? "http://localhost:5000",
  },
  AUTH_ENABLED: {
    description: 'Set to "true" to enforce the (app) session guard and reject unauthenticated /api/* calls.',
    schema: (value: string | undefined) => value === 'true'
  },
  KEYCLOAK_ISSUER_URL: {
    description: "Keycloak realm issuer, used for OIDC discovery",
    schema: (value: string | undefined) =>
      value ?? "http://localhost:18080/realms/trade-envelope",
  },
  // Public client, and deliberately the only client id here: sign-in is authorization code + PKCE, so no
  // secret exists for this process to hold. The confidential client and its secret belong to the .NET API,
  // which is the only thing allowed to call Keycloak's Admin REST.
  KEYCLOAK_CLIENT_ID: {
    description: "OIDC public client SvelteKit signs in as",
    schema: (value: string | undefined) =>
      value ?? "trade-envelope-public-client",
  },
  AUTH_REDIRECT_BASE_URL: {
    description: "Externally reachable origin of this app; the OIDC redirect URI and cookie `secure` flag derive from it",
    schema: (value: string | undefined) => value ?? "http://localhost:5173",
  },
  PUBLIC_APP_NAME: {
    public: true,
  },
});
