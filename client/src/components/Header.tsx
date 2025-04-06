import { Link, useLocation } from 'wouter';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { User, LogOut, Menu } from "lucide-react";
import logoPath from "@assets/logo.png";
import { useEffect, useState } from "react";
import { useIsMobile } from '@/hooks/use-mobile';

export default function Header() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  const isMobile = useIsMobile();

  // Track window width for responsive adjustments
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Check if user is in guest mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsGuestMode(localStorage.getItem("guestMode") === "true");
    }
  }, [location]); // Re-check when location changes

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const exitGuestMode = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("guestMode");
      window.location.href = "/auth";
    }
  };

  // Determine which logo to show based on screen width
  const showFullLogo = windowWidth > 360; // Only show full logo if width > 360px

  return (
    <header className="border-b border-neutral-800/50 bg-transparent backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
        <div className="flex items-center flex-shrink-0">
          <Link href="/">
            <div className="flex items-center">
              <img src={logoPath} alt="StyleMatch logo" className="h-10 w-10 mr-2" />
              {showFullLogo && (
                <span className="text-2xl font-medium lowercase tracking-tight">
                  <span className="gradient-text">style</span>match
                </span>
              )}
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/">
            <span className={`text-sm font-medium hover:text-gray-400 transition-colors ${location === '/' ? 'text-white underline' : 'text-gray-300'}`}>
              home
            </span>
          </Link>
          <Link href="/closet">
            <span className={`text-sm font-medium hover:text-gray-400 transition-colors ${location === '/closet' ? 'text-white underline' : 'text-gray-300'}`}>
              my closet
            </span>
          </Link>
          <Link href="/outfit-creator">
            <span className={`text-sm font-medium hover:text-gray-400 transition-colors ${location === '/outfit-creator' ? 'text-white underline' : 'text-gray-300'}`}>
              outfit ideas
            </span>
          </Link>
          <Link href="/inspiration">
            <span className={`text-sm font-medium hover:text-gray-400 transition-colors ${location.startsWith('/inspiration') ? 'text-white underline' : 'text-gray-300'}`}>
              inspiration
            </span>
          </Link>
        </nav>

        {/* Account section - hidden on very small screens */}
        <div className="flex items-center">
          {/* User account menu - always show if logged in */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-xs">{user.username}</DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              {/* Show sign in button on medium screens only if in guest mode */}
              {isGuestMode && windowWidth > 360 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs mr-2"
                  onClick={exitGuestMode}
                >
                  sign in
                </Button>
              )}

              {/* Show sign in/create account buttons on medium screens only if not in guest mode */}
              {!isGuestMode && windowWidth > 500 && (
                <div className="flex space-x-2 mr-2">
                  <Link href="/auth">
                    <Button variant="outline" size="sm" className="text-xs">
                      sign in
                    </Button>
                  </Link>
                  {windowWidth > 640 && (
                    <Link href="/auth">
                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs bg-primary"
                        onClick={() => {
                          // Store preference to show register form
                          if (typeof window !== 'undefined') {
                            localStorage.setItem("showRegisterForm", "true");
                          }
                        }}
                      >
                        create account
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </>
          )}

          {/* Mobile menu - always show */}
          <div className="flex items-center md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-1 rounded-md hover:bg-zinc-800">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[240px] sm:w-[280px] bg-black border-zinc-800 text-zinc-200"
                onOpenAutoFocus={(e) => {
                  // Prevent auto focus which can cause blank white pages
                  e.preventDefault();
                }}
                onCloseAutoFocus={(e) => {
                  // Prevent auto focus which can cause blank white pages
                  e.preventDefault();
                }}
              >
                <nav className="flex flex-col space-y-4 mt-8">
                  <Link href="/" onClick={() => {
                    // Auto-close sidebar after 750ms
                    setTimeout(() => {
                      const closeButton = document.querySelector('[data-state="open"] button.absolute.right-4.top-4');
                      if (closeButton) {
                        (closeButton as HTMLElement).click();
                      }
                    }, 750);
                  }}>
                    <span className={`text-sm font-medium hover:text-gray-400 transition-colors ${location === '/' ? 'text-white underline' : 'text-gray-300'}`}>
                      home
                    </span>
                  </Link>
                  <Link href="/closet" onClick={() => {
                    setTimeout(() => {
                      const closeButton = document.querySelector('[data-state="open"] button.absolute.right-4.top-4');
                      if (closeButton) {
                        (closeButton as HTMLElement).click();
                      }
                    }, 750);
                  }}>
                    <span className={`text-sm font-medium hover:text-gray-400 transition-colors ${location === '/closet' ? 'text-white underline' : 'text-gray-300'}`}>
                      my closet
                    </span>
                  </Link>
                  <Link href="/outfit-creator" onClick={() => {
                    setTimeout(() => {
                      const closeButton = document.querySelector('[data-state="open"] button.absolute.right-4.top-4');
                      if (closeButton) {
                        (closeButton as HTMLElement).click();
                      }
                    }, 750);
                  }}>
                    <span className={`text-sm font-medium hover:text-gray-400 transition-colors ${location === '/outfit-creator' ? 'text-white underline' : 'text-gray-300'}`}>
                      outfit ideas
                    </span>
                  </Link>
                  <Link href="/inspiration" onClick={() => {
                    setTimeout(() => {
                      const closeButton = document.querySelector('[data-state="open"] button.absolute.right-4.top-4');
                      if (closeButton) {
                        (closeButton as HTMLElement).click();
                      }
                    }, 750);
                  }}>
                    <span className={`text-sm font-medium hover:text-gray-400 transition-colors ${location.startsWith('/inspiration') ? 'text-white underline' : 'text-gray-300'}`}>
                      inspiration
                    </span>
                  </Link>

                  {isGuestMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs mt-4"
                      onClick={exitGuestMode}
                    >
                      sign in
                    </Button>
                  )}

                  {!user && !isGuestMode && (
                    <div className="flex flex-col space-y-2 mt-4">
                      <Link href="/auth" onClick={() => {
                        setTimeout(() => {
                          const closeButton = document.querySelector('[data-state="open"] button.absolute.right-4.top-4');
                          if (closeButton) {
                            (closeButton as HTMLElement).click();
                          }
                        }, 750);
                      }}>
                        <Button variant="outline" size="sm" className="text-xs w-full">
                          sign in
                        </Button>
                      </Link>
                      <Link href="/auth" onClick={() => {
                        // Store preference to show register form
                        if (typeof window !== 'undefined') {
                          localStorage.setItem("showRegisterForm", "true");
                        }
                        // Auto-close sidebar
                        setTimeout(() => {
                          const closeButton = document.querySelector('[data-state="open"] button.absolute.right-4.top-4');
                          if (closeButton) {
                            (closeButton as HTMLElement).click();
                          }
                        }, 750);
                      }}>
                        <Button
                          variant="default"
                          size="sm"
                          className="text-xs w-full"
                        >
                          create account
                        </Button>
                      </Link>
                    </div>
                  )}

                  {user && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs mt-4"
                      onClick={handleLogout}
                    >
                      logout
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
