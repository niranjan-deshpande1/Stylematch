import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { Loader2 } from "lucide-react";
import { setGuestMode } from "@/lib/api";

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();

  // Check if user is already logged in and redirect
  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="container px-4 md:px-6 flex flex-col-reverse md:flex-row items-center justify-center md:gap-10 lg:gap-16">
        {/* Left column: Authentication form */}
        <div className="w-full max-w-md space-y-6 py-12">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">welcome to stylematch</h1>
            <p className="text-muted-foreground">
              sign in to access your personal wardrobe
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                sign in
              </CardTitle>
              <CardDescription>
                choose how you'd like to access your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsLoading(true);
                  // Save the return URL before redirecting
                  const currentPath = window.location.pathname;
                  const redirectPath = currentPath !== "/auth" ? currentPath : "/";
                  localStorage.setItem("redirectAfterAuth", redirectPath);
                  
                  // Redirect to Google authentication
                  window.location.href = "/api/auth/google";
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> connecting to google
                  </>
                ) : (
                  <>
                    <FcGoogle className="mr-2 h-5 w-5" />
                    continue with google
                  </>
                )}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  // Enable guest mode
                  setGuestMode(true);
                  
                  // Redirect to the originally intended URL or home
                  const redirectPath = localStorage.getItem("redirectAfterAuth") || "/";
                  navigate(redirectPath);
                  localStorage.removeItem("redirectAfterAuth");
                }}
              >
                continue as guest
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Hero section */}
        <div className="w-full max-w-md py-12 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">unlock your style potential</h2>
            <p className="text-muted-foreground">
              stylematch helps you organize your wardrobe, discover new outfit combinations, 
              and identify missing pieces to complete your personal style.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                1
              </div>
              <div>
                <h3 className="font-medium">upload inspiration</h3>
                <p className="text-sm text-muted-foreground">
                  save images that inspire your style goals
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                2
              </div>
              <div>
                <h3 className="font-medium">build your digital closet</h3>
                <p className="text-sm text-muted-foreground">
                  add and categorize your clothing items
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                3
              </div>
              <div>
                <h3 className="font-medium">discover new outfits</h3>
                <p className="text-sm text-muted-foreground">
                  get ai-powered outfit recommendations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}