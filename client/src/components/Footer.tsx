import { Link } from "wouter";

const FOOTER_LINKS = [
  { href: "/", label: "home" },
  { href: "/closet", label: "my closet" },
  { href: "/inspiration", label: "style inspiration" },
  { href: "/outfit-creator", label: "outfit creator" },
];

const linkClass = "text-gray-300 transition-colors duration-300 hover:text-white";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-800 bg-transparent py-12 text-white backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-4 flex items-center">
            <img src="/assets/logo.png" alt="StyleMatch logo" className="mr-2 h-8 w-8" />
            <h3 className="text-xl font-medium tracking-tight">
              <span className="gradient-text">style</span>match
            </h3>
          </div>
          <p className="max-w-lg text-sm text-gray-400">
            build outfits from the clothes you already own.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:gap-16">
          <div>
            <h4 className="mb-4 text-xs tracking-wider text-gray-400">links</h4>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {FOOTER_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-xs tracking-wider text-gray-400">contact & legal</h4>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <a
                href="mailto:help@stylematch.org"
                className="text-blue-400 underline underline-offset-2 transition-colors duration-300 hover:text-blue-300"
              >
                help@stylematch.org
              </a>
              <Link href="/privacy" className={linkClass}>
                privacy policy
              </Link>
              <Link href="/terms" className={linkClass}>
                terms of service
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-neutral-800 pt-8 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} stylematch. all rights reserved.
        </p>
      </div>
    </footer>
  );
}
