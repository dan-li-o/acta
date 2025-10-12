interface JsonResponseOptions {
  status?: number;
  headers?: HeadersInit;
}

export function jsonResponse(data: unknown, options: JsonResponseOptions = {}): Response {
  const { status = 200, headers = {} } = options;
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  });
}

export function textResponse(text: string, status = 200): Response {
  return new Response(text, { status });
}
