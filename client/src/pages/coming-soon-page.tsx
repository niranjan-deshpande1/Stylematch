import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

function WaitlistSignupForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/waitlist-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success!",
          description: result.message,
        });
        setEmail(""); // Clear the form
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Something went wrong. Please try again.",
        });
      }
    } catch (error) {
      console.error('Waitlist signup error:', error);
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Unable to connect. Please check your internet connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <p className="text-white font-medium text-lg">
            Get early access when we launch
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-white/40 h-12 text-base"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="bg-white text-black hover:bg-gray-200 font-medium px-8 h-12 text-base"
            >
              {isSubmitting ? "Joining..." : "Join Waitlist"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-black text-white font-['Poppins',sans-serif]">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center space-y-12">
          {/* Logo/Brand */}
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
              <h2 className="text-4xl font-semibold text-white">Coming Soon</h2>
              <p className="text-lg text-gray-300 leading-relaxed">
                Transform your personal style with intelligent wardrobe
                organization, AI-powered outfit recommendations, and seamless
                style management.
              </p>
            </div>

            {/* Waitlist Signup Form */}
            <WaitlistSignupForm />
          </div>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-white/10">
            <p className="text-gray-400 text-sm">
              © 2025 stylematch.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}