import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function ComingSoonPage() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const emailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch("/api/email-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to submit email");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Thank you!",
        description: "We'll notify you when StyleMatch launches.",
      });
      setEmail("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please try again later.",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        variant: "destructive",
        title: "Please enter your email",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        variant: "destructive",
        title: "Please enter a valid email address",
      });
      return;
    }

    emailMutation.mutate(email);
  };

  return (
    <div className="min-h-screen bg-black text-white font-['Poppins',sans-serif]">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center space-y-12">
          {/* Logo/Brand - matching your existing style */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight">
              Style<span className="text-purple-400">Match</span>
            </h1>
            <p className="text-xl text-gray-300 font-light">
              AI-Powered Wardrobe Management
            </p>
          </div>

          {/* Coming Soon Section */}
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="space-y-6">
              <h2 className="text-4xl font-semibold text-white">
                Coming Soon
              </h2>
              <p className="text-lg text-gray-300 leading-relaxed">
                Transform your personal style with intelligent wardrobe organization, 
                AI-powered outfit recommendations, and seamless style management.
              </p>
            </div>

            {/* Email Signup Form */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <p className="text-white font-medium text-lg">
                    Drop your email below if interested:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-white/40 h-12 text-base"
                      disabled={emailMutation.isPending}
                    />
                    <Button 
                      type="submit"
                      size="lg"
                      disabled={emailMutation.isPending}
                      className="bg-white text-black hover:bg-gray-200 font-medium px-8 h-12 text-base"
                    >
                      {emailMutation.isPending ? "Submitting..." : "Notify Me"}
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            {/* Features Preview */}
            <div className="grid md:grid-cols-3 gap-6 pt-8">
              <div className="text-center space-y-2">
                <div className="text-white font-medium text-lg">Smart Organization</div>
                <div className="text-gray-400 text-sm">AI-categorized wardrobe management</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-white font-medium text-lg">Style Insights</div>
                <div className="text-gray-400 text-sm">Personalized outfit recommendations</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-white font-medium text-lg">Inspiration Gallery</div>
                <div className="text-gray-400 text-sm">Curated style inspiration feed</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-16">
            <p className="text-gray-500 text-sm">
              © 2025 StyleMatch. Built with AI-powered intelligence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}