import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import PageTransition from "@/components/PageTransition";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Closet from "@/pages/Closet";
import Inspiration from "@/pages/Inspiration";
import InspirationUpload from "@/pages/InspirationUpload";
import ClosetUpload from "@/pages/ClosetUpload";
import OutfitIdeas from "@/pages/OutfitIdeas";
import MissingPieces from "@/pages/MissingPieces";
import StyleMatching from "@/pages/StyleMatching";
import OutfitCreator from "@/pages/OutfitCreator";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import AuthPage from "@/pages/auth-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Layout>
      <PageTransition>
        <Switch>
          <Route path="/" component={Home} />
          <ProtectedRoute path="/closet" component={Closet} />
          <ProtectedRoute path="/inspiration" component={Inspiration} />
          <ProtectedRoute path="/inspiration-upload" component={InspirationUpload} />
          <ProtectedRoute path="/closet-upload" component={ClosetUpload} />
          <ProtectedRoute path="/outfit-ideas" component={OutfitIdeas} />
          <ProtectedRoute path="/outfits" component={OutfitIdeas} />
          <ProtectedRoute path="/inspiration/:id/missing-pieces" component={MissingPieces} />
          <ProtectedRoute path="/inspiration/:id/style-matching" component={StyleMatching} />
          <ProtectedRoute path="/outfit-creator" component={OutfitCreator} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route component={NotFound} />
        </Switch>
      </PageTransition>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
