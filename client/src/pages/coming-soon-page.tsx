import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

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

            {/* Simple Email Link */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-8">
              <div className="space-y-6 text-center">
                <p className="text-white font-medium text-lg">
                  Interested in early access?
                </p>
                <p className="text-gray-300 text-base">
                  Click below and send an email with "interested" to join our waitlist
                </p>
                <a
                  href="mailto:help@stylematch.org?subject=StyleMatch%20Waitlist&body=interested"
                  className="inline-block bg-white text-black hover:bg-gray-200 font-medium px-8 py-3 rounded-lg text-base transition-colors"
                >
                  Join Waitlist
                </a>
              </div>
            </div>
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