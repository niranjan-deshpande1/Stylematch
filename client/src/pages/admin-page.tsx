import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Get current site mode (password-protected)
  const { data: modeData, isLoading, error } = useQuery({
    queryKey: ['site-mode', password],
    queryFn: async () => {
      if (!password) return null;
      const response = await fetch('/api/admindesh09/mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        throw new Error('Invalid password');
      }
      const data = await response.json();
      setIsAuthenticated(true);
      return data;
    },
    enabled: !!password,
    retry: false
  });

  // Handle authentication errors with useEffect to prevent infinite re-renders
  useEffect(() => {
    if (error && password) {
      setIsAuthenticated(false);
    }
  }, [error, password]);

  // Toggle site mode mutation
  const toggleModeMutation = useMutation({
    mutationFn: async (newMode: 'coming-soon' | 'app') => {
      const response = await fetch('/api/admindesh09/toggle-mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: newMode, password }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle mode');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['site-mode'] });
      toast({
        title: "Mode Updated",
        description: `Site is now in ${data.mode} mode`,
      });
      
      // Reload the page to apply the new mode
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update site mode",
      });
    }
  });

  const currentMode = modeData?.mode || 'app';
  const isComingSoonMode = currentMode === 'coming-soon';

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="container max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Admin Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Admin Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && password && queryClient.invalidateQueries({ queryKey: ['site-mode', password] })}
                />
              </div>
              <Button 
                onClick={() => password && queryClient.invalidateQueries({ queryKey: ['site-mode', password] })}
                className="w-full"
                disabled={!password || isLoading}
              >
                {isLoading ? 'Authenticating...' : 'Access Admin Panel'}
              </Button>
              {error && (
                <p className="text-sm text-red-500 text-center">Invalid admin password</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="container max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">StyleMatch Admin Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Mode Display */}
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Current Site Mode</h3>
              <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                isComingSoonMode 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {isComingSoonMode ? 'Coming Soon Page' : 'Full Application'}
              </div>
            </div>

            {/* Mode Toggle Buttons */}
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="font-medium mb-3">Switch Site Mode</h4>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => toggleModeMutation.mutate('coming-soon')}
                    disabled={toggleModeMutation.isPending || isComingSoonMode}
                    variant={isComingSoonMode ? "default" : "outline"}
                    size="lg"
                  >
                    {toggleModeMutation.isPending ? "Switching..." : "Enable Coming Soon"}
                  </Button>
                  
                  <Button
                    onClick={() => toggleModeMutation.mutate('app')}
                    disabled={toggleModeMutation.isPending || !isComingSoonMode}
                    variant={!isComingSoonMode ? "default" : "outline"}
                    size="lg"
                  >
                    {toggleModeMutation.isPending ? "Switching..." : "Enable Full App"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Mode Descriptions */}
            <div className="border-t pt-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h5 className="font-medium">Coming Soon Mode</h5>
                  <p className="text-muted-foreground">
                    Shows a landing page with email signup for visitors. 
                    Emails are saved to email-signups.txt file.
                  </p>
                </div>
                <div className="space-y-2">
                  <h5 className="font-medium">Full App Mode</h5>
                  <p className="text-muted-foreground">
                    Shows the complete StyleMatch application with all features, 
                    authentication, and functionality.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="border-t pt-6 text-center space-y-3">
              <h5 className="font-medium">Quick Access</h5>
              <div className="flex justify-center gap-3">
                <Button variant="ghost" size="sm" asChild>
                  <a href="/" target="_blank">View Site</a>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/coming-soon" target="_blank">View Coming Soon Page</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}