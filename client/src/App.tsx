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

function Router() {
  return (
    <Layout>
      <PageTransition>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/closet" component={Closet} />
          <Route path="/inspiration" component={Inspiration} />
          <Route path="/inspiration-upload" component={InspirationUpload} />
          <Route path="/closet-upload" component={ClosetUpload} />
          <Route path="/outfit-ideas" component={OutfitIdeas} />
          <Route path="/outfits" component={OutfitIdeas} />
          <Route path="/inspiration/:id/missing-pieces" component={MissingPieces} />
          <Route path="/inspiration/:id/style-matching" component={StyleMatching} />
          <Route path="/outfit-creator" component={OutfitCreator} />
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
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
