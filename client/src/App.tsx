import { Route, Switch } from "wouter";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getSiteMode } from "@/lib/api";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Closet from "@/pages/Closet";
import ClosetUpload from "@/pages/ClosetUpload";
import Inspiration from "@/pages/Inspiration";
import InspirationUpload from "@/pages/InspirationUpload";
import StyleMatching from "@/pages/StyleMatching";
import MissingPieces from "@/pages/MissingPieces";
import OutfitCreator from "@/pages/OutfitCreator";
import AuthPage from "@/pages/AuthPage";
import AdminPage from "@/pages/AdminPage";
import ComingSoonPage from "@/pages/ComingSoonPage";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import NotFound from "@/pages/NotFound";

function Router() {
  const { data } = useQuery({ queryKey: ["/api/site/mode"], queryFn: getSiteMode });

  return (
    <Switch>
      {/* The admin page stays reachable in coming-soon mode so it can be switched back. */}
      <Route path="/admin" component={AdminPage} />
      {data?.mode === "coming-soon" ? (
        <Route component={ComingSoonPage} />
      ) : (
        <Route>
          <Layout>
            <Switch>
              <ProtectedRoute path="/" component={Home} />
              <ProtectedRoute path="/closet" component={Closet} />
              <ProtectedRoute path="/closet-upload" component={ClosetUpload} />
              <ProtectedRoute path="/inspiration" component={Inspiration} />
              <ProtectedRoute path="/inspiration-upload" component={InspirationUpload} />
              <ProtectedRoute path="/inspiration/:id/style-matching" component={StyleMatching} />
              <ProtectedRoute path="/inspiration/:id/missing-pieces" component={MissingPieces} />
              <ProtectedRoute path="/outfit-creator" component={OutfitCreator} />
              <Route path="/auth" component={AuthPage} />
              <Route path="/coming-soon" component={ComingSoonPage} />
              <Route path="/privacy" component={Privacy} />
              <Route path="/terms" component={Terms} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Route>
      )}
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
