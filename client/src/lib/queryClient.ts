import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Track if guest mode is enabled
let isGuestMode = false;

// Initialize guest mode from sessionStorage or localStorage if in browser environment
if (typeof window !== 'undefined') {
  // Prefer sessionStorage for guest mode (cleaner when closing browser)
  isGuestMode = sessionStorage.getItem('guestMode') === 'true' ||
                localStorage.getItem('guestMode') === 'true';
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
    // Add cache-busting timestamp to prevent cached responses
    // This is especially important for authentication endpoints
    const timestamp = new Date().getTime();
    const url = `${queryKey[0] as string}${(queryKey[0] as string).includes('?') ? '&' : '?'}_t=${timestamp}`;

    const res = await fetch(url, {
      credentials: "include", // Always include credentials for cross-domain compatibility
      headers: {
        ...createHeaders(),
        // Add cache-control headers to prevent caching
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
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
