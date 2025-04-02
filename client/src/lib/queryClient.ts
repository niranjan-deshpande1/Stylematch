import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Track if guest mode is enabled
let isGuestMode = false;

// Initialize guest mode from localStorage if in browser environment
if (typeof window !== 'undefined') {
  isGuestMode = localStorage.getItem('guestMode') === 'true';
}

// Function to enable/disable guest mode headers in API requests
export function setGuestModeHeader(enable: boolean) {
  isGuestMode = enable;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper to create headers with guest mode support
function createHeaders(hasData: boolean = false): HeadersInit {
  const headers: HeadersInit = {};
  
  if (hasData) {
    headers["Content-Type"] = "application/json";
  }
  
  if (isGuestMode) {
    headers["X-Guest-Mode"] = "true";
  }
  
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: createHeaders(!!data),
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: createHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
