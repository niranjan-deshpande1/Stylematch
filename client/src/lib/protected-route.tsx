import { useEffect, type ComponentType } from "react";
import { Redirect, Route, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const REDIRECT_KEY = "redirectAfterAuth";

/** A route that needs a session (signed in or guest). Otherwise sends people to /auth. */
export function ProtectedRoute({ path, component: Component }: { path: string; component: ComponentType }) {
  const { hasSession, isLoading } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    // Remember where they were headed so /auth can send them back.
    if (!isLoading && !hasSession) sessionStorage.setItem(REDIRECT_KEY, location);
  }, [isLoading, hasSession, location]);

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      ) : hasSession ? (
        <Component />
      ) : (
        <Redirect to="/auth" />
      )}
    </Route>
  );
}
