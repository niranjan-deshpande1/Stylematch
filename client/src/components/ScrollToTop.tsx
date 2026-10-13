import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowUp } from "lucide-react";

/** Jumps to the top on every route change, and shows a back-to-top button on long pages. */
export default function ScrollToTop() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location]);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="back to top"
      className={`fixed bottom-6 right-6 z-50 rounded-full border border-zinc-700 bg-zinc-900 p-3 text-zinc-300 shadow-lg transition-all duration-300 hover:bg-zinc-800 ${
        visible ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
