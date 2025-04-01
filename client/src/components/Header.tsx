import { Link, useLocation } from 'wouter';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Header() {
  const [location] = useLocation();

  return (
    <header className="border-b border-neutral-800/50 bg-transparent backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/">
            <span className="text-2xl font-medium lowercase tracking-tight">
              <span className="gradient-text">style</span>match
            </span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/">
            <span className={`text-sm font-medium hover:text-gray-400 transition-colors ${location === '/' ? 'text-white underline' : 'text-gray-300'}`}>
              Home
            </span>
          </Link>
          <Link href="/closet">
            <span className={`text-sm font-medium hover:text-gray-400 transition-colors ${location === '/closet' ? 'text-white underline' : 'text-gray-300'}`}>
              My Closet
            </span>
          </Link>
          <Link href="/outfit-ideas">
            <span className={`text-sm font-medium hover:text-gray-400 transition-colors ${location === '/outfit-ideas' ? 'text-white underline' : 'text-gray-300'}`}>
              Outfit Ideas
            </span>
          </Link>
          <Link href="/inspiration">
            <span className={`text-sm font-medium hover:text-gray-400 transition-colors ${location.startsWith('/inspiration') ? 'text-white underline' : 'text-gray-300'}`}>
              Inspiration
            </span>
          </Link>
        </nav>
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
                    Home
                  </span>
                </Link>
                <Link href="/closet">
                  <span className={`text-sm font-medium hover:text-gray-400 transition-colors ${location === '/closet' ? 'text-white underline' : 'text-gray-300'}`}>
                    My Closet
                  </span>
                </Link>
                <Link href="/outfit-ideas">
                  <span className={`text-sm font-medium hover:text-gray-400 transition-colors ${location === '/outfit-ideas' ? 'text-white underline' : 'text-gray-300'}`}>
                    Outfit Ideas
                  </span>
                </Link>
                <Link href="/inspiration">
                  <span className={`text-sm font-medium hover:text-gray-400 transition-colors ${location.startsWith('/inspiration') ? 'text-white underline' : 'text-gray-300'}`}>
                    Inspiration
                  </span>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
