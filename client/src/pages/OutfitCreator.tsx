import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getClothingItems, getOutfit } from '@/lib/api';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ClothingItem, OutfitCombination } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { SocialShareModal } from '@/components/ui/social-share-modal';
import {
  Tags,
  Sun,
  Calendar,
  Flame,
  Shirt,
  Share2,
  Palette,
  ArrowUp,
  Sparkles
} from 'lucide-react';

const SEASONS = [
  { id: 'all-season', name: 'all season' },
  { id: 'spring', name: 'spring' },
  { id: 'summer', name: 'summer' },
  { id: 'fall', name: 'fall' },
  { id: 'winter', name: 'winter' },
];

// Remove old styles - replaced with style themes below

const STYLE_THEMES = [
  { id: 'chill', name: 'chill', description: 'relaxed and comfortable' },
  { id: 'old-money', name: 'old money', description: 'timeless elegance' },
  { id: 'streetwear', name: 'streetwear', description: 'urban and trendy' },
  { id: 'minimalist', name: 'minimalist', description: 'clean and simple' },
  { id: 'boho', name: 'boho', description: 'free-spirited and artistic' },
  { id: 'preppy', name: 'preppy', description: 'classic and polished' },
  { id: 'edgy', name: 'edgy', description: 'bold and alternative' },
  { id: 'romantic', name: 'romantic', description: 'soft and feminine' },
];

export default function OutfitCreator() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    season: '',
    styleTheme: '',
  });
  const [selectedOutfit, setSelectedOutfit] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Get all clothing items first
  const { data: allClothingItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/closet'],
    queryFn: () => getClothingItems(),
  });

  // Generate outfits using LLM API
  const { data: outfitsResponse, isLoading: isLoadingOutfits } = useQuery({
    queryKey: ['/api/chat/outfits', filters, allClothingItems?.length],
    queryFn: async () => {
      if (!allClothingItems?.length) return { outfits: [], error: null };

      // Check minimum requirements
      const tops = allClothingItems.filter(item => item.category === 'tops');
      const bottoms = allClothingItems.filter(item => item.category === 'bottoms');
      const shoes = allClothingItems.filter(item => item.category === 'shoes');

      if (tops.length === 0 || bottoms.length === 0) {
        return {
          outfits: [],
          error: "Your closet needs at least one top and one bottom to create outfits."
        };
      }

      // Categorize items for the LLM prompt
      const accessories = allClothingItems.filter(item => item.category === 'accessories');
      const outerwear = allClothingItems.filter(item => item.category === 'outerwear');

      // Build the LLM prompt
      const seasonText = filters.season ? ` for ${filters.season} season` : '';
      const themeText = filters.styleTheme ? ` with ${filters.styleTheme} aesthetic` : '';

      const prompt = `You are a professional fashion stylist. Create 6-8 unique outfit combinations from this user's closet${seasonText}${themeText}.

CLOTHING INVENTORY:
TOPS (${tops.length}): ${tops.map(t => `${t.id}: ${t.category} - ${t.styleTags?.join(', ')}`).join('; ')}
BOTTOMS (${bottoms.length}): ${bottoms.map(b => `${b.id}: ${b.category} - ${b.styleTags?.join(', ')}`).join('; ')}
SHOES (${shoes.length}): ${shoes.map(s => `${s.id}: ${s.category} - ${s.styleTags?.join(', ')}`).join('; ')}
${outerwear.length > 0 ? `OUTERWEAR (${outerwear.length}): ${outerwear.map(o => `${o.id}: ${o.category} - ${o.styleTags?.join(', ')}`).join('; ')}` : ''}
${accessories.length > 0 ? `ACCESSORIES (${accessories.length}): ${accessories.map(a => `${a.id}: ${a.category} - ${a.styleTags?.join(', ')}`).join('; ')}` : ''}

rules:
- each outfit has exactly one top and one bottom
- include shoes when there are any (${shoes.length} available)
- use accessories and outerwear when they fit
- 3 to 5 items per outfit
- don't repeat a top and bottom pair
- keep colors and styles coordinated

${filters.styleTheme ? `STYLE THEME: Focus on ${STYLE_THEMES.find(t => t.id === filters.styleTheme)?.description} aesthetic` : ''}

Return JSON format:
{
  "outfits": [
    {
      "name": "Creative outfit name",
      "description": "Brief styling explanation",
      "items": [item_id_numbers],
      "style": "${filters.styleTheme || 'mixed'}",
      "season": "${filters.season || 'versatile'}",
      "occasion": "recommended_occasion"
    }
  ]
}`;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt })
        });

        const data = await response.json();
        const parsedOutfits = JSON.parse(data.response);
        return {
          outfits: parsedOutfits.outfits || [],
          error: null
        };
      } catch (parseError) {
        console.error('Failed to parse LLM outfit response:', parseError);
        return {
          outfits: [],
          error: "AI couldn't generate outfits. Please try different filters."
        };
      }
    },
    enabled: !!allClothingItems?.length,
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const isLoading = isLoadingOutfits || isLoadingItems;
  const outfits = outfitsResponse?.outfits || [];
  const outfitsError = outfitsResponse?.error;

  // Get clothing items for a specific outfit
  const getOutfitItems = (outfit: OutfitCombination): ClothingItem[] => {
    if (!outfit.items || !allClothingItems) return [];

    // Convert item ids to numbers if they are strings to ensure proper matching
    const outfitItemIds = outfit.items.map(id =>
      typeof id === 'string' ? parseInt(id, 10) : id
    );

    // Match items from the closet to the outfit's items
    const matchedItems = allClothingItems.filter(item =>
      outfitItemIds.includes(item.id)
    );

    return matchedItems;
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key] === value ? '' : value
    }));
  };

  const handleShareOutfit = (outfit: OutfitCombination) => {
    setSelectedOutfit(outfit.id);
    setShareModalOpen(true);
  };

  return (
    <section className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl mb-2 font-light">outfit ideas</h1>
        <p className="text-zinc-400 mb-8">create perfect combinations from your closet items</p>

        {/* Filters */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg mb-8">
          <h2 className="flex items-center text-zinc-300 mb-4 gap-2">
            <Tags className="h-5 w-5" />
            <span>filters</span>
          </h2>

          <div className="space-y-6">

            {/* Season filter */}
            <div>
              <h3 className="text-sm text-zinc-400 mb-3">season</h3>
              <div className="flex flex-wrap gap-2">
                {SEASONS.map(season => (
                  <Button
                    key={season.id}
                    variant={filters.season === season.id ? "default" : "outline"}
                    size="sm"
                    className={
                      filters.season === season.id
                        ? "hover:bg-zinc-700"
                        : "border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                    }
                    onClick={() => handleFilterChange('season', season.id)}
                  >
                    {season.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Style theme preferences */}
            <div>
              <h3 className="text-sm text-zinc-400 mb-3">style theme</h3>
              <div className="flex flex-wrap gap-2">
                {STYLE_THEMES.map(theme => (
                  <Button
                    key={theme.id}
                    variant={filters.styleTheme === theme.id ? "default" : "outline"}
                    size="sm"
                    className={
                      filters.styleTheme === theme.id
                        ? "hover:bg-zinc-700"
                        : "border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                    }
                    onClick={() => handleFilterChange('styleTheme', theme.id)}
                    title={theme.description}
                  >
                    {theme.name}
                  </Button>
                ))}
              </div>
              <div className="text-center mt-2">
                <p className="text-xs text-zinc-500 italic">
                  select a style theme to influence your outfit suggestions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <h2 className="text-2xl mb-4 font-light">
          suggested outfits
        </h2>

        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <Sparkles className="h-12 w-12 mb-4 text-purple-400 animate-pulse" />
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
            <p className="text-zinc-400 text-center">AI is creating your outfits...</p>
          </div>
        ) : outfitsError ? (
          <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg">
            <Flame className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
            <h3 className="text-xl mb-2">couldn't create outfits</h3>
            <p className="text-zinc-500 mb-6 max-w-md mx-auto">
              {outfitsError}
            </p>
            <Button onClick={() => setFilters({ season: '', styleTheme: '' })}>
              clear filters
            </Button>
          </div>
        ) : outfits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {outfits.map((outfit: any, index: number) => {
              const outfitItems = getOutfitItems(outfit);
              const outfitKey = outfit.id || `outfit-${index}-${outfit.items?.join('-') || 'unknown'}`;
              return (
                <Card key={outfitKey} className="bg-zinc-900 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg font-normal">{outfit.name}</CardTitle>
                    <CardDescription>{outfit.description}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    {outfitItems.length > 0 ? (
                      <div className="flex gap-3 mb-4 overflow-x-auto pb-2">
                        {outfitItems.map((item) => (
                          <div key={item.id} className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-md bg-zinc-800">
                            <img
                              src={item.imageUrl}
                              alt={item.category}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-20 bg-zinc-800 rounded-md mb-4">
                        <p className="text-sm text-zinc-500">Item images not available</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {outfit.style && (
                        <div className="px-2 py-1 text-xs rounded-full bg-zinc-800 text-zinc-400 flex items-center">
                          <Shirt className="h-3 w-3 mr-1" />
                          {outfit.style}
                        </div>
                      )}
                      {outfit.occasion && (
                        <div className="px-2 py-1 text-xs rounded-full bg-zinc-800 text-zinc-400 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {outfit.occasion}
                        </div>
                      )}
                      {outfit.season && (
                        <div className="px-2 py-1 text-xs rounded-full bg-zinc-800 text-zinc-400 flex items-center">
                          <Sun className="h-3 w-3 mr-1" />
                          {outfit.season}
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="border-t border-zinc-800 pt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-zinc-700"
                      onClick={() => {
                        toast({
                          title: "saved",
                          description: "outfit saved to your collection"
                        });
                      }}
                    >
                      save outfit
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleShareOutfit(outfit)}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      share
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg">
            <Flame className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
            <h3 className="text-xl mb-2">no outfit suggestions found</h3>
            <p className="text-zinc-500 mb-6 max-w-md mx-auto">
              Try changing your filters or adding more items to your closet.
            </p>
            <Button onClick={() => setFilters({ season: '', styleTheme: '' })}>
              clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Social Share Modal */}
      {selectedOutfit && (
        <SocialShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          outfitId={selectedOutfit}
          outfitName="custom outfit"
          outfitItems={[]}
        />
      )}
    </section>
  );
}