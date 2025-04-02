import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const [location] = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentPage, setCurrentPage] = useState(children);
  const [nextPage, setNextPage] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    if (nextPage) {
      // If we have a nextPage queued up, animate out the current page
      setIsAnimating(true);
      
      // After animation completes, swap pages
      const timer = setTimeout(() => {
        setCurrentPage(nextPage);
        setNextPage(null);
        setIsAnimating(false);
      }, 300); // Match this with CSS transition duration
      
      return () => clearTimeout(timer);
    }
  }, [nextPage]);

  useEffect(() => {
    // When location changes, queue up the next page
    setNextPage(children);
  }, [children, location]);

  return (
    <div
      className={`transition-opacity duration-300 ${
        isAnimating ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {currentPage}
    </div>
  );
}