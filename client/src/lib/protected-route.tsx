import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, useLocation, Redirect } from "wouter";
import { useEffect, useState } from "react";
import { isGuestMode } from "@/lib/api";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading, error } = useAuth();
  const [location] = useLocation();
  const [retryCount, setRetryCount] = useState(0);
  const [showLoading, setShowLoading] = useState(false);

  // Determine guest mode status with more reliable checks
  const guestMode = typeof window !== 'undefined' &&
    (localStorage.getItem("guestMode") === "true" ||
     sessionStorage.getItem("guestMode") === "true" ||
     isGuestMode());

  // Add a slight delay before showing loading indicator to prevent flashing
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => setShowLoading(true), 300);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    // If still loading, wait
    if (isLoading) return;

    // If authenticated or in guest mode, we're good
    if (user || guestMode) return;

    // Handle auth errors with retries
    if (error && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 1000 * (retryCount + 1)); // Increasing backoff
      return () => clearTimeout(timer);
    }

    // If not authenticated and not in guest mode, save the intended URL
    if (typeof window !== 'undefined' && !user && !guestMode && !isLoading) {
      localStorage.setItem("redirectAfterAuth", location);
    }
  }, [user, location, isLoading, guestMode, error, retryCount]);

  // Show nicer loading indicator with delayed appearance
  if (isLoading && showLoading) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your session...</p>
        </div>
      </Route>
    );
  }

  // Don't render anything during brief loading
  if (isLoading && !showLoading) {
    return <Route path={path}><div className="min-h-screen"></div></Route>;
  }

  // If the user is not authenticated and not in guest mode, redirect to auth
  if (!user && !guestMode) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Allow access to the route for authenticated users or guests
  return <Route path={path} component={Component} />;
}