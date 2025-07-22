import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Sparkles, ShoppingBag, Upload, Palette } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OnboardingComplete() {
  const [, setLocation] = useLocation();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const pathOptions = [
    {
      id: 'upload-closet',
      title: 'Upload Your Closet',
      description: 'Start by adding your existing clothes to create personalized outfits',
      icon: Upload,
      color: 'bg-blue-500',
      route: '/closet-upload'
    },
    {
      id: 'outfit-creator',
      title: 'Create Outfits',
      description: 'Use your style profile to generate outfit combinations',
      icon: Palette,
      color: 'bg-purple-500',
      route: '/outfit-creator'
    },
    {
      id: 'shopping',
      title: 'Shop Missing Pieces',
      description: 'Find items that complete your style based on your preferences',
      icon: ShoppingBag,
      color: 'bg-green-500',
      route: '/shopping'
    }
  ];

  const handleContinue = () => {
    if (selectedPath) {
      const option = pathOptions.find(opt => opt.id === selectedPath);
      if (option) {
        setLocation(option.route);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="relative"
            >
              <CheckCircle className="w-20 h-20 text-green-500" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, duration: 0.3 }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="w-8 h-8 text-yellow-500" />
              </motion.div>
            </motion.div>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Your Style Profile is Complete!
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            We've analyzed your preferences and created a personalized style profile.
            Now let's put it to work and transform your wardrobe experience.
          </p>
        </motion.div>

        {/* Path Selection */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h2 className="text-2xl font-semibold text-center mb-8 text-gray-900 dark:text-white">
            Choose Your Next Step
          </h2>

          <div className="grid gap-6 md:grid-cols-3 mb-12">
            {pathOptions.map((option, index) => {
              const Icon = option.icon;
              const isSelected = selectedPath === option.id;

              return (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                >
                  <Card
                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                      isSelected
                        ? 'ring-2 ring-purple-500 shadow-lg'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedPath(option.id)}
                  >
                    <CardContent className="p-6 text-center">
                      <div className={`w-16 h-16 ${option.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>

                      <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                        {option.title}
                      </h3>

                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                        {option.description}
                      </p>

                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          className="mt-4"
                        >
                          <CheckCircle className="w-6 h-6 text-purple-500 mx-auto" />
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="flex justify-center gap-4"
        >
          <Button
            variant="outline"
            onClick={() => setLocation('/swipe-onboarding')}
            className="px-8 py-3"
          >
            Retake Style Quiz
          </Button>

          <Button
            onClick={handleContinue}
            disabled={!selectedPath}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700"
          >
            Continue to {selectedPath ? pathOptions.find(opt => opt.id === selectedPath)?.title : 'Next Step'}
          </Button>
        </motion.div>

      </div>
    </div>
  );
}