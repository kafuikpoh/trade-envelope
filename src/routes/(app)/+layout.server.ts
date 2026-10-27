import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";


export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const session = cookies.get("session");
  // if (!session)
  //   redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
  // return { user: { id: "TODO" } }; // TODO: validate session against API
};
