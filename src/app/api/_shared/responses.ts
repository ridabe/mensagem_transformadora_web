export function json(
  body: unknown,
  init?: number | ResponseInit,
): Response {
  const responseInit: ResponseInit =
    typeof init === "number" ? { status: init } : init ?? {};
  const headers = new Headers(responseInit.headers);
  if (!headers.has("content-type")) headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...responseInit, headers });
}

export function errorResponse(status: number, message: string, details?: unknown): Response {
  return json(
    {
      error: {
        message,
        details: details ?? null,
      },
    },
    status,
  );
}

export function publicErrorResponse(status: number, message: string): Response {
  return json({ success: false, message }, status);
}

