function describe(t: string): string {
  try {
    const j = JSON.parse(t);
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
    return j.detail ?? j.title ?? j.message ?? t;
  } catch {
    return t;
  }
}


export async function call<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok)
    throw new Error(describe(text) || `Request failed (${res.status})`);
  return (text ? JSON.parse(text) : undefined) as T;
}
