import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { joinWaitlist } from "@/lib/api";

export default function ComingSoonPage() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const signup = useMutation({
    mutationFn: joinWaitlist,
    onSuccess: (result) => {
      toast({ title: "you're in", description: result.message });
      setEmail("");
    },
    onError: (error) => toast({ title: "couldn't sign you up", description: error.message, variant: "destructive" }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (email.trim()) signup.mutate(email.trim());
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <div className="space-y-12 text-center">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
              <span className="gradient-text">style</span>match
            </h1>
            <p className="text-xl font-light text-gray-300">your closet, organized</p>
          </div>

          <div className="mx-auto max-w-2xl space-y-8">
            <div className="space-y-6">
              <h2 className="text-4xl font-semibold">coming soon</h2>
              <p className="text-lg leading-relaxed text-gray-300">
                organize your wardrobe, get outfit ideas from clothes you already own, and find out exactly what's
                missing from the looks you love.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-8">
              <form onSubmit={submit} className="space-y-4">
                <p className="text-lg font-medium">get early access when we launch</p>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={signup.isPending}
                    className="h-12 flex-1 border-white/20 bg-white/10 text-base text-white placeholder:text-gray-400"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={signup.isPending}
                    className="h-12 bg-white px-8 text-base font-medium text-black hover:bg-gray-200"
                  >
                    {signup.isPending ? "joining..." : "join waitlist"}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <footer className="mt-16 border-t border-white/10 pt-8">
            <p className="text-sm text-gray-400">© {new Date().getFullYear()} stylematch</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
