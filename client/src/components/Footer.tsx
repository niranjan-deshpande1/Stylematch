import { Link } from 'wouter';

export default function Footer() {
  return (
    <footer className="text-white py-12 border-t border-neutral-800 bg-transparent backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-medium lowercase tracking-tight mb-4">
              <span className="gradient-text">style</span>match
            </h3>
            <p className="text-gray-400 text-sm">
              Your AI-powered fashion assistant for outfit inspiration and wardrobe organization.
            </p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-4">Links</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/">
                  <span className="text-gray-300 hover:text-white transition-colors">Home</span>
                </Link>
              </li>
              <li>
                <Link href="/closet">
                  <span className="text-gray-300 hover:text-white transition-colors">My Closet</span>
                </Link>
              </li>
              <li>
                <Link href="/inspiration-upload">
                  <span className="text-gray-300 hover:text-white transition-colors">Style Inspiration</span>
                </Link>
              </li>
              <li>
                <Link href="/outfit-ideas">
                  <span className="text-gray-300 hover:text-white transition-colors">Outfit Ideas</span>
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="mailto:hello@stylematch.org" className="text-gray-300 hover:text-white transition-colors">
                  hello@stylematch.org
                </a>
              </li>
              <li>
                <Link href="/privacy">
                  <span className="text-gray-300 hover:text-white transition-colors">Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link href="/terms">
                  <span className="text-gray-300 hover:text-white transition-colors">Terms of Service</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-neutral-800 text-gray-500 text-xs text-center">
          <p>© {new Date().getFullYear()} StyleMatch. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
