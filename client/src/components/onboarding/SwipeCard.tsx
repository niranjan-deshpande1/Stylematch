
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useState } from 'react';

interface SwipeCardProps {
  image: {
    id: number;
    image_url: string;
    style_tags: string[];
  };
  onSwipe: (direction: 'like' | 'dislike', imageId: number, styleTags: string[]) => void;
  isVisible: boolean;
  index: number;
}

export default function SwipeCard({ image, onSwipe, isVisible, index }: SwipeCardProps) {
  const [exitX, setExitX] = useState(0);

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);
  const rotate = useTransform(x, [-150, 0, 150], [-15, 0, 15]);
  const scale = useTransform(x, [-150, 0, 150], [0.9, 1, 0.9]);

  // Color overlays for swipe feedback
  const likeOpacity = useTransform(x, [10, 100], [0, 0.8]);
  const dislikeOpacity = useTransform(x, [-100, -10], [0.8, 0]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;

    if (Math.abs(info.offset.x) > threshold) {
      const direction = info.offset.x > 0 ? 'like' : 'dislike';
      setExitX(info.offset.x > 0 ? 300 : -300);
      onSwipe(direction, image.id, image.style_tags);
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{
        x,
        opacity,
        rotate,
        scale,
        zIndex: 10 - index,
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={exitX !== 0 ? { x: exitX, opacity: 0 } : {}}
      transition={exitX !== 0 ? { duration: 0.3 } : { type: 'spring', stiffness: 300, damping: 30 }}
      whileDrag={{ scale: 1.05 }}
    >
      {/* Main Card */}
      <div className="relative w-full h-full bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl">
        {/* Fixed image with explicit dimensions */}
        <img
          src={image.image_url}
          alt="Style inspiration"
          className="absolute inset-0 object-cover"
          style={{
            width: '100%',
            height: '100%',
            minHeight: '500px',
            zIndex: 1
          }}
          onLoad={(e) => {
          }}
          onError={(e) => {
            console.error('✗ Image failed to load:', image.image_url, e);
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" style={{ zIndex: 2 }} />

        {/* Like Overlay */}
        <motion.div
          style={{ opacity: likeOpacity, zIndex: 3 }}
          className="absolute inset-0 bg-green-500/30 border-4 border-green-500 rounded-3xl flex items-center justify-center pointer-events-none"
        >
          <div className="bg-green-500 text-white px-8 py-4 rounded-2xl font-bold text-2xl transform rotate-12 shadow-lg">
            LOVE IT
          </div>
        </motion.div>

        {/* Dislike Overlay */}
        <motion.div
          style={{ opacity: dislikeOpacity, zIndex: 3 }}
          className="absolute inset-0 bg-red-500/30 border-4 border-red-500 rounded-3xl flex items-center justify-center pointer-events-none"
        >
          <div className="bg-red-500 text-white px-8 py-4 rounded-2xl font-bold text-2xl transform -rotate-12 shadow-lg">
            NOT ME
          </div>
        </motion.div>

        {/* Style Tags */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none" style={{ zIndex: 4 }}>
          <div className="flex flex-wrap gap-2">
            {image.style_tags.map((tag, tagIndex) => (
              <span
                key={tagIndex}
                className="px-3 py-1 bg-black/70 text-white text-sm rounded-full border border-zinc-700 backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Swipe Hints */}
        <div className="absolute top-6 left-0 right-0 flex justify-between px-6 pointer-events-none">
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <div className="w-6 h-6 rounded-full border-2 border-red-500 flex items-center justify-center">
              <span className="text-red-500 text-xs">✕</span>
            </div>
            <span>Not for me</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <span>Love it</span>
            <div className="w-6 h-6 rounded-full border-2 border-green-500 flex items-center justify-center">
              <span className="text-green-500 text-xs">♥</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
