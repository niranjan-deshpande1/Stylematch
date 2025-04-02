import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, useLocation, Redirect } from "wouter";
import { useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const guestMode = typeof window !== 'undefined' && localStorage.getItem("guestMode") === "true";

  useEffect(() => {
    // If not authenticated and not in guest mode, save the intended URL
    if (typeof window !== 'undefined' && !user && !guestMode && !isLoading) {
      localStorage.setItem("redirectAfterAuth", location);
    }
  }, [user, location, isLoading, guestMode]);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
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