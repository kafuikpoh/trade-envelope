// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SignedInUser } from "#lib/server/session.js";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: SignedInUser | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
