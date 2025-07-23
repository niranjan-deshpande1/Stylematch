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
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [showLoading, setShowLoading] = useState(false);

  // Check guest mode status
  const guestMode = isGuestMode();

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
    // If not authenticated and not in guest mode, save the intended URL
    if (typeof window !== 'undefined' && !user && !guestMode && !isLoading) {
      localStorage.setItem("redirectAfterAuth", location);
    }
  }, [user, location, isLoading, guestMode]);

  // Show loading indicator
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