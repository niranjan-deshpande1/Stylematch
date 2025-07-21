import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import SwipeFlow from '@/components/onboarding/SwipeFlow';
import StyleProfile from '@/components/onboarding/StyleProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, ArrowRight, User } from 'lucide-react';

export default function SwipeOnboarding() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<'intro' | 'swipe' | 'profile'>('intro');

  const handleStartSwiping = () => {
    setCurrentStep('swipe');
  };

  const handleSwipeComplete = () => {
    setCurrentStep('profile');
  };

  const handleProfileComplete = () => {
    // Navigate to the main app after completing onboarding
    setLocation('/');
  };

  if (currentStep === 'swipe') {
    return <SwipeFlow onComplete={handleSwipeComplete} />;
  }

  if (currentStep === 'profile') {
    return <StyleProfile onComplete={handleProfileComplete} />;
  }

  // Intro step
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full"
      >
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardContent className="p-8 text-center space-y-6">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <div className="relative mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-white" />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ opacity: 0.3 }}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="space-y-4"
            >
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Discover Your Style
              </h1>
              <p className="text-gray-600 leading-relaxed">
                We'll show you outfit inspiration and learn your preferences through simple swipes. 
                In just a few minutes, we'll create your personalized style profile.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span>Swipe on styles</span>
                </div>
                <ArrowRight className="h-4 w-4" />
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Get your profile</span>
                </div>
              </div>

              <Button 
                onClick={handleStartSwiping}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105"
              >
                Start Style Discovery
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button 
                variant="ghost" 
                onClick={() => setLocation('/')}
                className="w-full text-gray-500 hover:text-gray-700"
              >
                Skip for now
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}