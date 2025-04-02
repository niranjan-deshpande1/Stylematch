import { Link } from 'wouter';
import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import logoPath from "@assets/logo.png";
import { Button } from '@/components/ui/button';

export default function Footer() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Handle scroll event to show/hide the scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Handle link clicks to scroll to top
  const handleLinkClick = () => {
    // Allow a small delay for the navigation to complete
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 50);
  };

  return (
    <footer className="text-white py-12 border-t border-neutral-800 bg-transparent backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Brand section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <img src={logoPath} alt="StyleMatch logo" className="h-8 w-8 mr-2" />
            <h3 className="text-xl font-medium lowercase tracking-tight">
              <span className="gradient-text">style</span>match
            </h3>
          </div>
          <p className="text-gray-400 text-sm max-w-lg">
            Your AI-powered fashion assistant for outfit inspiration and wardrobe organization.
          </p>
        </div>

        {/* Links and contact in a single row on larger screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-16">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-4">links</h4>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <Link href="/">
                  <span onClick={handleLinkClick} className="text-gray-300 hover:text-white transition-colors duration-300 cursor-pointer">
                    home
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/closet">
                  <span onClick={handleLinkClick} className="text-gray-300 hover:text-white transition-colors duration-300 cursor-pointer">
                    my closet
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/inspiration">
                  <span onClick={handleLinkClick} className="text-gray-300 hover:text-white transition-colors duration-300 cursor-pointer">
                    style inspiration
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/outfit-ideas">
                  <span onClick={handleLinkClick} className="text-gray-300 hover:text-white transition-colors duration-300 cursor-pointer">
                    outfit ideas
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-4">contact & legal</h4>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <a
                  href="mailto:help@stylematch.org"
                  className="text-blue-400 hover:text-blue-300 transition-colors duration-300 inline-block underline underline-offset-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  help@stylematch.org
                </a>
              </div>
              <div>
                <Link href="/privacy">
                  <span onClick={handleLinkClick} className="text-gray-300 hover:text-white transition-colors duration-300 cursor-pointer">
                    privacy policy
                  </span>
                </Link>
              </div>
              <div>
                <Link href="/terms">
                  <span onClick={handleLinkClick} className="text-gray-300 hover:text-white transition-colors duration-300 cursor-pointer">
                    terms of service
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-neutral-800 text-gray-500 text-xs text-center">
          <p>© {new Date().getFullYear()} StyleMatch. All rights reserved.</p>
        </div>
      </div>

      {/* Scroll to top button */}
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
      >
        <Button
          onClick={scrollToTop}
          size="icon"
          className="rounded-full w-12 h-12 bg-zinc-800/80 hover:bg-zinc-700 backdrop-blur-sm shadow-lg border border-zinc-700 hover-lift"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </div>
    </footer>
  );
}
