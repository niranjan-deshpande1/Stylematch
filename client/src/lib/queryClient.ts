import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Track if guest mode is enabled
let isGuestMode = false;

// Clear any existing guest mode state on app start - require explicit choice
if (typeof window !== 'undefined') {
  // Clear guest mode state to force authentication choice
  sessionStorage.removeItem('guestMode');
  localStorage.removeItem('guestMode');
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
  // Add cache-busting timestamp to prevent cached responses
  // This is especially important for authentication endpoints
  const timestamp = new Date().getTime();
  const urlWithTimestamp = `${url}${url.includes('?') ? '&' : '?'}_t=${timestamp}`;

  // Fetch with retry for network failures
  const fetchWithRetry = async (attempt = 1, maxAttempts = 3): Promise<Response> => {
    try {
      const res = await fetch(urlWithTimestamp, {
        method,
        headers: {
          ...createHeaders(!!data),
          // Add cache-control headers to prevent browser caching
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include", // Always send cookies with requests
        redirect: "follow", // Follow redirects automatically
        mode: "cors", // Enable CORS for cross-origin requests
        keepalive: true, // Keep connection alive for reliability
      });

      return res;
    } catch (err) {
      // Only retry on network errors, not on HTTP errors
      if (attempt < maxAttempts && err instanceof Error &&
          (err.name === 'TypeError' || err.message.includes('network'))) {
        // Exponential backoff
        const delay = Math.min(1000 * 2 ** attempt, 5000);

        return new Promise(resolve => {
          setTimeout(() => resolve(fetchWithRetry(attempt + 1, maxAttempts)), delay);
        });
      }
      throw err;
    }
  };

  const res = await fetchWithRetry();

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

    // Fetch with retry for network failures
    const fetchWithRetry = async (attempt = 1, maxAttempts = 3): Promise<Response> => {
      try {
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
        return res;
      } catch (err) {
        // Only retry on network errors, not on HTTP errors
        if (attempt < maxAttempts && err instanceof Error &&
            (err.name === 'TypeError' || err.message.includes('network'))) {
          // Exponential backoff
          const delay = Math.min(1000 * 2 ** attempt, 5000);

          return new Promise(resolve => {
            setTimeout(() => resolve(fetchWithRetry(attempt + 1, maxAttempts)), delay);
          });
        }
        throw err;
      }
    };

    const res = await fetchWithRetry();

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
