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
import Shopping from "@/pages/Shopping";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import AuthPage from "@/pages/auth-page";
import ComingSoonPage from "@/pages/coming-soon-page";
import AdminPage from "@/pages/admin-page";
import SwipeOnboarding from "./pages/SwipeOnboarding";
import StyleProfile from "./components/onboarding/StyleProfile";
import OnboardingComplete from "./pages/OnboardingComplete";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { useQuery } from "@tanstack/react-query";

function Router() {
  // Check current site mode
  const { data: modeData } = useQuery({
    queryKey: ['site-mode'],
    queryFn: async () => {
      const response = await fetch('/api/admin/mode');
      return response.json();
    },
    refetchInterval: 30000, // Check every 30 seconds
  });

  const isComingSoonMode = modeData?.mode === 'coming-soon';

  // Show coming soon page if mode is set to coming-soon
  if (isComingSoonMode) {
    return <ComingSoonPage />;
  }

  return (
    <Layout>
      <PageTransition>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/swipe-onboarding" component={SwipeOnboarding} />
          <Route path="/onboarding-complete" component={OnboardingComplete} />
          <ProtectedRoute path="/closet" component={Closet} />
          <ProtectedRoute path="/inspiration" component={Inspiration} />
          <ProtectedRoute path="/inspiration-upload" component={InspirationUpload} />
          <ProtectedRoute path="/closet-upload" component={ClosetUpload} />
          <ProtectedRoute path="/outfit-ideas" component={OutfitIdeas} />
          <ProtectedRoute path="/outfits" component={OutfitIdeas} />
          <ProtectedRoute path="/inspiration/:id/missing-pieces" component={MissingPieces} />
          <ProtectedRoute path="/inspiration/:id/style-matching" component={StyleMatching} />
          <ProtectedRoute path="/outfit-creator" component={OutfitCreator} />
          <ProtectedRoute path="/shopping" component={Shopping} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route path="/coming-soon" component={ComingSoonPage} />
          <Route path="/admindesh09" component={AdminPage} />
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