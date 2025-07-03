import { useEffect, useState, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { useLocation } from 'wouter';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [location] = useLocation();
  const scrollListenerRef = useRef<(() => void) | null>(null);
  
  // Create a single function instance that won't change on re-renders
  const createScrollListener = () => {
    if (!scrollListenerRef.current) {
      scrollListenerRef.current = () => {
        // Check various scroll properties for maximum browser compatibility
        const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        setIsVisible(scrollY > 300);
      };
    }
    return scrollListenerRef.current;
  };

  // Set up scroll event listener on mount and when location changes
  useEffect(() => {
    const scrollListener = createScrollListener();
    
    // Run immediately to set initial state
    scrollListener();
    
    // Add event listener with passive option for better performance
    window.addEventListener('scroll', scrollListener, { passive: true });
    
    // Clean up
    return () => {
      window.removeEventListener('scroll', scrollListener);
    };
  }, [location]);
  
  // Force update scroll state after location changes
  useEffect(() => {
    // Initial check
    const scrollListener = createScrollListener();
    scrollListener();
    
    // Check again after a delay to account for page rendering
    const timers = [
      setTimeout(scrollListener, 100),
      setTimeout(scrollListener, 500),
      setTimeout(scrollListener, 1000)
    ];
    
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [location]);
  
  // Handle different scroll behavior on specific pages
  useEffect(() => {
    // Pages that might need special handling
    if (location.includes('outfit-creator') || location.includes('outfits')) {
      // Force visibility check after content loads
      const timer = setTimeout(() => {
        const scrollListener = createScrollListener();
        scrollListener();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [location]);

  // Scroll to top handler
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 z-[9999] p-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 
                text-white shadow-lg hover:from-pink-600 hover:to-purple-600 transition-all duration-300 
                ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
      aria-label="back to top"
      style={{ transition: 'opacity 0.3s ease, transform 0.3s ease' }}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}