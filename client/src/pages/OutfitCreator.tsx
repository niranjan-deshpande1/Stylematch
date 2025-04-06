import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOutfitCombinations, getClothingItems, getOutfit } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ClothingItem, OutfitCombination } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { StyleThemePalette, useStyleThemes } from '@/components/ui/style-theme-palette';
import { SocialShareModal } from '@/components/ui/social-share-modal';
import {
  Tags,
  Sun,
  Calendar,
  Flame,
  Shirt,
  Share2,
  Palette,
  ArrowUp
} from 'lucide-react';

const SEASONS = [
  { id: 'all-season', name: 'all season' },
  { id: 'spring', name: 'spring' },
  { id: 'summer', name: 'summer' },
  { id: 'fall', name: 'fall' },
  { id: 'winter', name: 'winter' },
];

const STYLES = [
  { id: 'casual', name: 'casual' },
  { id: 'formal', name: 'formal' },
  { id: 'sporty', name: 'sporty' },
  { id: 'bohemian', name: 'bohemian' },
  { id: 'streetwear', name: 'streetwear' },
  { id: 'minimalist', name: 'minimalist' },
];

export default function OutfitCreator() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    season: '',
    style: '',
  });
  const [selectedOutfit, setSelectedOutfit] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const { themes, selectedThemeId, setSelectedThemeId } = useStyleThemes();

  // Get outfit combinations with theme preference
  const { data: outfits = [], isLoading: isLoadingOutfits } = useQuery({
    queryKey: ['/api/outfits', filters, selectedThemeId],
    queryFn: () => getOutfitCombinations({
      ...filters,
      themeId: selectedThemeId || undefined
    }),
    retry: false
  } as any);

  // Get all clothing items for display
  const { data: allClothingItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/closet'],
    queryFn: () => getClothingItems(),
  });

  // Get selected outfit items
  const { data: selectedOutfitData } = useQuery({
    queryKey: ['/api/outfits', selectedOutfit],
    queryFn: () => getOutfit(selectedOutfit!),
    enabled: !!selectedOutfit,
  });

  const isLoading = isLoadingOutfits || isLoadingItems;

  // Get clothing items for a specific outfit
  const getOutfitItems = (outfit: OutfitCombination): ClothingItem[] => {
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

  // Filter available themes based on closet content
  const getAvailableThemes = () => {
    // Always include neutral and monochrome as they work with any closet
    const alwaysAvailableThemes = ['neutral', 'monochrome', 'dark'];

    // Define theme keyword associations
    const themeKeywords: Record<string, string[]> = {
      'pastel': ['pastel', 'light', 'soft', 'gentle', 'baby blue', 'light pink', 'lavender', 'mint'],
      'vibrant': ['vibrant', 'bright', 'bold', 'colorful', 'neon', 'saturated', 'vivid'],
      'earthy': ['earthy', 'natural', 'earth tone', 'brown', 'beige', 'olive', 'terracotta', 'khaki'],
      'cool': ['cool', 'blue', 'teal', 'green', 'turquoise', 'navy', 'aqua', 'ice'],
      'warm': ['warm', 'red', 'orange', 'yellow', 'amber', 'gold', 'burgundy', 'rust']
    };

    // Extract all tags from closet items
    const allTags = allClothingItems.flatMap(item => item.styleTags || []);

    // Determine which themes match the closet content
    const matchingThemeIds = Object.entries(themeKeywords).reduce((acc, [themeId, keywords]) => {
      const hasMatchingItems = keywords.some(keyword =>
        allTags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))
      );

      if (hasMatchingItems) {
        acc.push(themeId);
      }

      return acc;
    }, [...alwaysAvailableThemes]);

    // Return filtered themes
    return themes.filter(theme => matchingThemeIds.includes(theme.id));
  };

  // Get the filtered themes based on closet content
  const availableThemes = getAvailableThemes();

  // Clear any selected theme that's not available
  React.useEffect(() => {
    if (selectedThemeId && !availableThemes.some(theme => theme.id === selectedThemeId)) {
      setSelectedThemeId(undefined);
    }
  }, [selectedThemeId, availableThemes]);

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

            {/* Style filter */}
            <div>
              <h3 className="text-sm text-zinc-400 mb-3">style</h3>
              <div className="flex flex-wrap gap-2">
                {STYLES.map(style => (
                  <Button
                    key={style.id}
                    variant={filters.style === style.id ? "default" : "outline"}
                    size="sm"
                    className={
                      filters.style === style.id
                        ? "hover:bg-zinc-700"
                        : "border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                    }
                    onClick={() => handleFilterChange('style', style.id)}
                  >
                    {style.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Style theme preferences */}
            <div>
              <h3 className="text-sm text-zinc-400 mb-3">style theme</h3>
              <StyleThemePalette
                themes={availableThemes}
                selectedThemeId={selectedThemeId}
                onSelectTheme={setSelectedThemeId}
                className="mb-4"
              />
              <div className="text-center">
                <p className="text-xs text-zinc-500 italic">
                  select a style theme to influence your outfit suggestions
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  showing themes based on your closet items
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
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : (outfits as OutfitCombination[]).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(outfits as OutfitCombination[]).map((outfit: OutfitCombination) => {
              const outfitItems = getOutfitItems(outfit);
              return (
                <Card key={outfit.id} className="bg-zinc-900 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors">
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
            <Button onClick={() => setFilters({ season: '', style: '' })}>
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
          outfitName={selectedOutfitData?.name || "custom"}
          outfitItems={
            selectedOutfitData
              ? getOutfitItems(selectedOutfitData)
              : []
          }
        />
      )}
    </section>
  );
}