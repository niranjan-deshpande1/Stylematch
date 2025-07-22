import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import type { StyleProfileResponse } from '@shared/schema';

interface StyleProfileProps {
  onComplete?: () => void;
}

export default function StyleProfile({ onComplete }: StyleProfileProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Extract session ID from URL params
  useEffect(() => {
    const urlParts = location.split('?');
    if (urlParts.length > 1) {
      const params = new URLSearchParams(urlParts[1]);
      const session = params.get('session');
      setSessionId(session);
    } else {
      console.error('StyleProfile: No session parameter found in URL:', location);
    }
  }, [location]);

  const { data: styleProfile, isLoading } = useQuery({
    queryKey: ['style-profile', sessionId],
    queryFn: async (): Promise<StyleProfileResponse> => {
      const response = await fetch(`/api/style-profile?session=${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch style profile');
      }
      return response.json();
    },
    enabled: !!sessionId,
  });

  if (isLoading || !styleProfile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-light text-zinc-300 mb-4">Loading your style profile...</h2>
        </div>
      </div>
    );
  }

  const topStyles = Object.entries(styleProfile.styleVector)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-900 px-6 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">✨</span>
            </div>
            <h1 className="text-3xl font-light text-zinc-300 mb-2">Your Style Profile</h1>
            <p className="text-zinc-500">Based on {styleProfile.swipeCount} style preferences</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Style Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-300">Your Style Personality</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 leading-relaxed text-lg">
                {styleProfile.summaryText}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-zinc-500">Confidence Score:</span>
                <div className="flex-1 max-w-32">
                  <Progress value={styleProfile.confidenceScore * 100} className="h-2" />
                </div>
                <span className="text-sm text-zinc-400">
                  {Math.round(styleProfile.confidenceScore * 100)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Style Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-300">Your Top Style Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {topStyles.map(([style, score], index) => (
                <motion.div
                  key={style}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="text-zinc-300 capitalize font-medium">
                      {style.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-zinc-800 rounded-full h-2">
                      <div
                        className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000"
                        style={{ width: `${score * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-zinc-500 w-12 text-right">
                      {Math.round(score * 100)}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col gap-4"
        >
          {!user && (
            <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-medium text-zinc-300 mb-2">Save Your Style Profile</h3>
                <p className="text-zinc-400 mb-4">
                  Create an account to save your style preferences and get personalized recommendations.
                </p>
                <Button
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  asChild
                >
                  <Link href="/auth">Create Account</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700"
              asChild
            >
              <Link href="/closet-upload">Start Building Your Closet</Link>
            </Button>

            <Button
              className="flex-1 bg-gradient-to-r from-purple-900/50 to-pink-900/50 hover:from-purple-900/70 hover:to-pink-900/70 text-zinc-300 border border-zinc-700"
              asChild
            >
              <Link href="/inspiration-upload">Find Style Inspiration</Link>
            </Button>
          </div>

          {onComplete ? (
            <Button
              onClick={onComplete}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              Continue to StyleMatch
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="text-zinc-500 hover:text-zinc-400"
              asChild
            >
              <Link href="/">Explore StyleMatch</Link>
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
}