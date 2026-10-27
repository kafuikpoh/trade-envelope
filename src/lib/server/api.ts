import { API_BASE_URL } from "$app/env/private";
import { error, type Cookies } from "@sveltejs/kit";
import type { ZodType } from "zod";

export const forward = (
  f: typeof fetch,
  cookies: Cookies,
  method: string,
  path: string,
  body?: string,
) => {
  const token = cookies.get("session"); // TODO: the OpenAPI doc declares no security scheme; confirm auth style
  return f(`${API_BASE_URL}${path}`, {
    method,
    body,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
};

/** Server-side JSON call; throws a SvelteKit error on non-2xx. */
export async function api<T>(
  f: typeof fetch,
  cookies: Cookies,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await forward(
    f,
    cookies,
    method,
    path,
    body === undefined ? undefined : JSON.stringify(body),
  );
  if (!res.ok) error(res.status, (await res.text()) || res.statusText);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Like api(), but validates the payload with a zod schema (502 if the backend contract drifts). */
export async function apiParsed<T>(
  f: typeof fetch,
  cookies: Cookies,
  method: string,
  path: string,
  schema: ZodType<T>,
  body?: unknown,
): Promise<T> {
  const raw = await api<unknown>(f, cookies, method, path, body);
  const r = schema.safeParse(raw);
  if (!r.success) {
    console.error(`Contract mismatch ${method} ${path}`, r.error.issues);
    error(
      502,
      `Unexpected response from ${path}: ${r.error.issues[0]?.path.join(".")} ${r.error.issues[0]?.message}`,
    );
  }
  return r.data;
}

export type Sent<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };
/** Non-throwing call for form actions: returns a readable message for 400/404/409. */
export async function send<T = unknown>(
  f: typeof fetch,
  cookies: Cookies,
  method: string,
  path: string,
  body?: unknown,
): Promise<Sent<T>> {
  const res = await forward(
    f,
    cookies,
    method,
    path,
    body === undefined ? undefined : JSON.stringify(body),
  );
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  if (res.ok) return { ok: true, data: json as T };
  return {
    ok: false,
    status: res.status,
    message: describe(json) ?? (text || res.statusText),
  };
}
function describe(j: any): string | undefined {
  if (!j || typeof j !== "object") return undefined;
  const e = j.errors;
  if (Array.isArray(e))
    return e
      .map((x: any) =>
        typeof x === "string"
          ? x
          : [
              x.field ?? x.propertyName ?? x.name,
              x.errorMessage ?? x.message ?? x.error,
            ]
              .filter(Boolean)
              .join(": "),
      )
      .join("\n");
  if (e && typeof e === "object")
    return Object.entries(e)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");
  return j.detail ?? j.title ?? j.message;
}
/** Create endpoints return the new id, either bare or as { id }. */
export const idOf = (d: any): string | undefined =>
  typeof d === "string" ? d : d?.id;

/** Optional data: returns null (and logs) on 400/404/409, non-2xx or contract mismatch, never throws. */
export async function soft<T>(
  f: typeof fetch,
  cookies: Cookies,
  method: string,
  path: string,
  schema: ZodType<T, any, any>,
): Promise<T | null> {
  const r = await send(f, cookies, method, path);
  if (!r.ok) {
    if (![400, 404, 409].includes(r.status))
      console.warn(`${method} ${path} -> ${r.status}`);
    return null;
  }
  const p = schema.safeParse(r.data);
  if (!p.success) {
    console.warn(`Contract mismatch ${method} ${path}`, p.error.issues[0]);
    return null;
  }
  return p.data;
}
