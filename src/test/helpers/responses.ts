type JsonResponseInit = Omit<ResponseInit, "headers"> & {
  readonly headers?: Record<string, string>;
};

export const createJsonResponse = (
  body: unknown,
  init: JsonResponseInit = {},
): Response => {
  const headers = new Headers({ "content-type": "application/json" });
  if (init.headers !== undefined) {
    Object.entries(init.headers).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }
  return new Response(JSON.stringify(body), { ...init, headers });
};

export const createTextResponse = (
  body: string,
  init: JsonResponseInit = {},
): Response => {
  const headers = new Headers({ "content-type": "text/plain" });
  if (init.headers !== undefined) {
    Object.entries(init.headers).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }
  return new Response(body, { ...init, headers });
};

export const createErrorResponse = (
  status: number,
  body: unknown = { error: "error" },
): Response => createJsonResponse(body, { status });
