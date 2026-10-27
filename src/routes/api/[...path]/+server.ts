import { forward } from "#lib/server/api.js";
import type { RequestHandler } from "./$types";

/** Browser calls go through here so the API base URL and session token stay server-side. */
const proxy: RequestHandler = async ({ params, url, request, cookies, fetch }) => {
  const body = request.method === "GET" ? undefined : await request.text();
  const res = await forward(
    fetch,
    cookies,
    request.method,
    `/${params.path}${url.search}`,
    body || undefined,
  );
  const type = res.headers.get("content-type");
  return new Response(res.body, {
    status: res.status,
    headers: type ? { "content-type": type } : {},
  });
};

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
