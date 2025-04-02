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
import { User, LogOut } from "lucide-react";
import logoPath from "@assets/logo.png";
import { useEffect, useState } from "react";

export default function Header() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isGuestMode, setIsGuestMode] = useState(false);

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

  return (
    <header className="border-b border-neutral-800/50 bg-transparent backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/">
            <div className="flex items-center">
              <img src={logoPath} alt="StyleMatch logo" className="h-10 w-10 mr-2" />
              <span className="text-2xl font-medium lowercase tracking-tight">
                <span className="gradient-text">style</span>match
              </span>
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

        {/* Account section */}
        <div className="flex items-center space-x-4">
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
          ) : isGuestMode ? (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={exitGuestMode}
            >
              sign in
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Link href="/auth">
                <Button variant="outline" size="sm" className="text-xs">
                  sign in
                </Button>
              </Link>
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
            </div>
          )}

          <div className="flex items-center md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <button type="button" className="text-white p-2" aria-label="Open menu">
                  <i className="fas fa-bars text-xl"></i>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[240px] sm:w-[280px]">
                <nav className="flex flex-col space-y-4 mt-8">
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
                      <Link href="/auth">
                        <Button variant="outline" size="sm" className="text-xs w-full">
                          sign in
                        </Button>
                      </Link>
                      <Link href="/auth">
                        <Button
                          variant="default"
                          size="sm"
                          className="text-xs w-full"
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
