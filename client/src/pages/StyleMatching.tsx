import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getStyleMatching, getClothingItems } from '@/lib/api';
import { ClothingItem } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ChevronLeft, Filter, Tag, Home } from 'lucide-react';

export default function StyleMatching() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/inspiration/:id/style-matching');
  const inspirationId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();

  // Get style matching data
  const { data: matchingData, isLoading: isLoadingMatching } = useQuery({
    queryKey: [`/api/inspiration/${inspirationId}/matching`],
    queryFn: () => getStyleMatching(inspirationId),
    enabled: !!inspirationId,
    retry: false,
    onSuccess: () => {
      // Optional: You can add successful fetch logic here
    },
    onError: (error) => {
      console.error('Error fetching style matching data:', error);
      toast({
        title: 'error',
        description: 'failed to get style matching data',
        variant: 'destructive'
      });
    }
  } as any);

  // Get all clothing items
  const { data: allClothingItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/closet'],
    queryFn: () => getClothingItems(),
    enabled: !!matchingData,
  });

  // Filter matching items
  const matchingItems = allClothingItems.filter(item => 
    matchingData?.matchingItems.includes(item.id)
  );

  const isLoading = isLoadingMatching || isLoadingItems;

  // Animation for score bar
  const [scoreWidth, setScoreWidth] = useState(0);
  useEffect(() => {
    if (matchingData) {
      setTimeout(() => {
        setScoreWidth(matchingData.matchScore);
      }, 100);
    }
  }, [matchingData]);

  if (!inspirationId) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <p className="text-lg mb-6">Invalid inspiration image ID</p>
        <Button onClick={() => setLocation('/inspiration')}>
          Back to Inspiration Gallery
        </Button>
      </div>
    );
  }

  return (
    <section className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center mb-6 gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full" 
            onClick={() => setLocation('/inspiration')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-light">style matches</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : (
          <>
            {/* Match score */}
            <div className="mb-8 bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-light">style match score</h2>
                <div className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-yellow-400" />
                  <span className="text-lg font-medium">{matchingData?.matchScore || 0}%</span>
                </div>
              </div>
              
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out"
                  style={{ width: `${scoreWidth}%` }}
                ></div>
              </div>
              
              <p className="text-zinc-400 text-sm">{matchingData?.styleNotes}</p>
            </div>

            {/* Matching items */}
            <h2 className="text-xl mb-4 font-light">matching items in your closet</h2>
            
            {matchingItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {matchingItems.map((item) => (
                  <Card key={item.id} className="bg-zinc-900 border-zinc-800 overflow-hidden group">
                    <div className="aspect-square relative overflow-hidden">
                      <img 
                        src={item.imageUrl} 
                        alt={item.category} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="text-zinc-300 mb-2">{item.category}</h3>
                      <div className="flex flex-wrap gap-2">
                        {item.styleTags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="border-zinc-700 text-zinc-400">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg">
                <Tag className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
                <h3 className="text-xl mb-2">no matching items found</h3>
                <p className="text-zinc-500 mb-6 max-w-md mx-auto">
                  Try uploading more clothing items to your closet that match this style inspiration.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    variant="outline" 
                    className="border-zinc-700"
                    onClick={() => setLocation('/closet-upload')}
                  >
                    add to closet
                  </Button>
                  <Button onClick={() => setLocation('/inspiration')}>
                    back to inspiration
                  </Button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button 
                variant="outline" 
                className="border-zinc-700" 
                onClick={() => setLocation('/inspiration')}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                back to inspiration
              </Button>
              
              {matchingItems.length > 0 && (
                <Button onClick={() => setLocation('/outfit-ideas')}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  create outfit
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}