import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
  API_BASE_URL: {
    description: "Base URL of the TradeEnvelope .NET API",
    schema: (value: string | undefined) => value ?? "http://localhost:5000",
  },
  AUTH_ENABLED: {
    description: 'TEMPORARY: set to "true" to enforce the session guard. Off until authentication is built.',
    schema: (value: string | undefined) => value === 'true'
  },
  API_SECRET: {},
  PUBLIC_APP_NAME: {
    public: true,
  },
});
