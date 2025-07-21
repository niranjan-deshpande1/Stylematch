import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import SwipeCard from './SwipeCard';
import { useAuth } from '@/hooks/use-auth';

// one generated card per style until there are real photos
const SWIPE_IMAGES = [
  {
    id: 1,
    image_url: "/api/style-card/minimal-1",
    style_tags: ["minimalist", "clean", "neutral"]
  },
  {
    id: 2,
    image_url: "/api/style-card/edgy-1",
    style_tags: ["edgy", "grunge", "alternative"]
  },
  {
    id: 3,
    image_url: "/api/style-card/classic-1",
    style_tags: ["classic", "preppy", "polished"]
  },
  {
    id: 4,
    image_url: "/api/style-card/streetwear-1",
    style_tags: ["streetwear", "urban", "casual"]
  },
  {
    id: 5,
    image_url: "/api/style-card/boho-1",
    style_tags: ["bohemian", "boho", "artistic"]
  },
  {
    id: 6,
    image_url: "/api/style-card/techwear-1",
    style_tags: ["techwear", "functional", "futuristic"]
  },
  {
    id: 7,
    image_url: "/api/style-card/romantic-1",
    style_tags: ["romantic", "feminine", "delicate"]
  },
  {
    id: 8,
    image_url: "/api/style-card/vintage-1",
    style_tags: ["vintage", "retro", "timeless"]
  },
  {
    id: 9,
    image_url: "/api/style-card/athleisure-1",
    style_tags: ["athleisure", "sporty", "comfortable"]
  },
  {
    id: 10,
    image_url: "/api/style-card/formal-1",
    style_tags: ["formal", "professional", "sophisticated"]
  }
];

interface SwipeData {
  imageId: number;
  direction: 'like' | 'dislike';
  styleTags: string[];
}

interface SwipeFlowProps {
  onComplete?: () => void;
}

export default function SwipeFlow({ onComplete }: SwipeFlowProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeData, setSwipeData] = useState<SwipeData[]>([]);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const swipeMutation = useMutation({
    mutationFn: async (data: SwipeData) => {
      const response = await fetch('/api/swipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_id: data.imageId,
          swipe_direction: data.direction,
          style_tags: data.styleTags,
          session_id: sessionId,
          user_id: user?.id || null
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
  });

  const generateProfileMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/generate-style-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: user?.id || null
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Call onComplete callback or navigate to default location
      if (onComplete) {
        onComplete();
      } else {
        setLocation(`/onboarding/profile?session=${sessionId}`);
      }
    }
  });

  const handleSwipe = async (direction: 'like' | 'dislike', imageId: number, styleTags: string[]) => {
    const newSwipe = { imageId, direction, styleTags };

    // Store swipe locally
    setSwipeData(prev => [...prev, newSwipe]);

    // Submit swipe to backend
    swipeMutation.mutate(newSwipe);

    // Move to next card
    setCurrentIndex(prev => prev + 1);

    // If this was the last card, generate style profile
    if (currentIndex >= SWIPE_IMAGES.length - 1) {
      setTimeout(() => {
        generateProfileMutation.mutate();
      }, 500); // Small delay for better UX
    }
  };

  const handleSkip = () => {
    setLocation('/');
  };

  const progress = ((currentIndex) / SWIPE_IMAGES.length) * 100;
  const isComplete = currentIndex >= SWIPE_IMAGES.length;

  if (isComplete && generateProfileMutation.isPending) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-light text-zinc-300 mb-4">Creating your style profile...</h2>
          <p className="text-zinc-500">
            Our AI is analyzing your preferences to create a personalized style guide just for you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-zinc-900">
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="text-zinc-400 hover:text-zinc-300"
        >
          Skip for now
        </Button>

        <div className="text-center">
          <h1 className="text-xl font-light text-zinc-300">Find Your Style</h1>
          <p className="text-sm text-zinc-500">
            {currentIndex} of {SWIPE_IMAGES.length}
          </p>
        </div>

        <div className="w-16"></div> {/* Spacer for centering */}
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4">
        <Progress value={progress} className="h-2" />
      </div>

      {/* Swipe Area */}
      <div className="flex-1 relative px-6 pb-6">
        <div className="relative max-w-sm mx-auto h-full">
          <AnimatePresence>
            {currentIndex < SWIPE_IMAGES.length && (
              <SwipeCard
                key={SWIPE_IMAGES[currentIndex].id}
                image={SWIPE_IMAGES[currentIndex]}
                onSwipe={handleSwipe}
                isVisible={true}
                index={0}
              />
            )}
          </AnimatePresence>

          {/* Instructions */}
          {currentIndex === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute bottom-8 left-0 right-0 text-center text-zinc-400"
            >
              <p className="text-sm">Swipe right for styles you love, left for ones you don't</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-t border-zinc-900">
        <div className="flex justify-center gap-6 max-w-sm mx-auto">
          <Button
            variant="outline"
            size="lg"
            className="w-16 h-16 rounded-full border-red-500 text-red-500 hover:bg-red-500/10"
            onClick={() => {
              const currentImage = SWIPE_IMAGES[currentIndex];
              if (currentImage) {
                handleSwipe('dislike', currentImage.id, currentImage.style_tags);
              }
            }}
            disabled={isComplete}
          >
            ✕
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-16 h-16 rounded-full border-green-500 text-green-500 hover:bg-green-500/10"
            onClick={() => {
              const currentImage = SWIPE_IMAGES[currentIndex];
              if (currentImage) {
                handleSwipe('like', currentImage.id, currentImage.style_tags);
              }
            }}
            disabled={isComplete}
          >
            ♥
          </Button>
        </div>
      </div>
    </div>
  );
}