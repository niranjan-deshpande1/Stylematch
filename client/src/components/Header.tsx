import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";

const NAV_LINKS = [
  { href: "/", label: "home" },
  { href: "/closet", label: "my closet" },
  { href: "/outfit-creator", label: "outfit creator" },
  { href: "/inspiration", label: "inspiration" },
];

export default function Header() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? location === "/" : location.startsWith(href));
  const linkClass = (href: string) =>
    `text-sm font-medium transition-colors hover:text-gray-400 ${isActive(href) ? "text-white underline" : "text-gray-300"}`;

  const accountButtons = (
    <>
      <Button asChild variant="outline" size="sm" className="w-full text-xs">
        <Link href="/auth" onClick={() => setMenuOpen(false)}>
          sign in
        </Link>
      </Button>
      <Button asChild size="sm" className="w-full bg-white text-xs text-black hover:bg-zinc-200">
        <Link href="/auth?tab=register" onClick={() => setMenuOpen(false)}>
          create account
        </Link>
      </Button>
    </>
  );

  return (
    <header className="border-b border-neutral-800/50 bg-transparent backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <img src="/assets/logo.png" alt="StyleMatch logo" className="mr-2 h-10 w-10" />
          <span className="hidden text-2xl font-medium tracking-tight min-[360px]:inline">
            <span className="gradient-text">style</span>match
          </span>
        </Link>

        <nav className="hidden items-center space-x-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="account">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs font-normal text-zinc-400">{user.username}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden gap-2 sm:flex">{accountButtons}</div>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-md hover:bg-zinc-800 md:hidden" aria-label="menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[260px] border-zinc-800 bg-black text-zinc-200">
              <SheetTitle className="sr-only">menu</SheetTitle>
              <nav className="mt-8 flex flex-col space-y-4">
                {NAV_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className={linkClass(link.href)} onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </Link>
                ))}
                <div className="flex flex-col gap-2 pt-4">
                  {user ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setMenuOpen(false);
                        logoutMutation.mutate();
                      }}
                    >
                      logout
                    </Button>
                  ) : (
                    accountButtons
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
