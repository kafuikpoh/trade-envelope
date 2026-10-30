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
  API_SECRET: {},
  KEYCLOAK_ISSUER_URL: {
    description: "Keycloak realm issuer, used for OIDC discovery",
    schema: (value: string | undefined) =>
      value ?? "http://localhost:18080/realms/trade-envelope",
  },
  KEYCLOAK_CLIENT_ID: {
    description: "OIDC confidential client SvelteKit signs in as",
    schema: (value: string | undefined) =>
      value ?? "trade-envelope-confidential-client",
  },
  KEYCLOAK_CLIENT_SECRET: {
    // Optional at boot so `npm run check` and `npm run build` work without it; /login/start refuses
    // to redirect until it is set. Never commit the value.
    description: "Client secret for KEYCLOAK_CLIENT_ID",
    schema: (value: string | undefined) => value || undefined,
  },
  AUTH_REDIRECT_BASE_URL: {
    description: "Externally reachable origin of this app; the OIDC redirect URI and cookie `secure` flag derive from it",
    schema: (value: string | undefined) => value ?? "http://localhost:5173",
  },
  PUBLIC_APP_NAME: {
    public: true,
  },
});
