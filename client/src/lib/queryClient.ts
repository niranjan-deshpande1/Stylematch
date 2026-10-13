import { QueryClient } from "@tanstack/react-query";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function throwIfNotOk(res: Response) {
  if (res.ok) return;
  let message = res.statusText;
  try {
    const body = await res.json();
    if (typeof body?.message === "string") message = body.message;
  } catch {
    // Response wasn't JSON; keep the status text.
  }
  throw new ApiError(res.status, message);
}

/** fetch wrapper for the API: sends JSON or FormData, includes cookies, throws ApiError on failure. */
async function apiRequest(method: string, url: string, body?: unknown): Promise<Response> {
  const isForm = body instanceof FormData;
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: body && !isForm ? { "Content-Type": "application/json" } : undefined,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });
  await throwIfNotOk(res);
  return res;
}

export async function apiJson<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await apiRequest(method, url, body);
  return res.status === 204 ? (undefined as T) : res.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
