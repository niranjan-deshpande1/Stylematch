import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOutfitCombinations, getClothingItems, getOutfit } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ClothingItem, OutfitCombination } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { ColorPalette, useColorPalette } from '@/components/ui/color-palette';
import { SocialShareModal } from '@/components/ui/social-share-modal';
import { 
  Tags, 
  Sparkles, 
  Sun, 
  Calendar, 
  Flame,
  Wine,
  Briefcase,
  ShoppingBag,
  Utensils,
  Shirt,
  Share2
} from 'lucide-react';

const OCCASIONS = [
  { id: 'casual', name: 'casual', icon: <ShoppingBag className="h-4 w-4" /> },
  { id: 'work', name: 'work', icon: <Briefcase className="h-4 w-4" /> },
  { id: 'dinner', name: 'dinner', icon: <Utensils className="h-4 w-4" /> },
  { id: 'party', name: 'party', icon: <Wine className="h-4 w-4" /> },
];

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
    occasion: '',
    season: '',
    style: '',
  });
  const [selectedOutfit, setSelectedOutfit] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const { colors, selectedColor, setSelectedColor } = useColorPalette();

  // Get outfit combinations
  const { data: outfits = [], isLoading: isLoadingOutfits } = useQuery({
    queryKey: ['/api/outfits', filters],
    queryFn: () => getOutfitCombinations(filters),
    retry: false,
    onError: (error) => {
      console.error('Error fetching outfit combinations:', error);
      toast({
        title: 'error',
        description: 'failed to get outfit combinations',
        variant: 'destructive'
      });
    }
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
    return allClothingItems.filter(item => outfit.items.includes(item.id));
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
            {/* Occasion filter */}
            <div>
              <h3 className="text-sm text-zinc-400 mb-3">occasion</h3>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map(occasion => (
                  <Button
                    key={occasion.id}
                    variant={filters.occasion === occasion.id ? "default" : "outline"}
                    size="sm"
                    className={
                      filters.occasion === occasion.id
                        ? "hover:bg-zinc-700"
                        : "border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                    }
                    onClick={() => handleFilterChange('occasion', occasion.id)}
                  >
                    {occasion.icon}
                    <span className="ml-2">{occasion.name}</span>
                  </Button>
                ))}
              </div>
            </div>
            
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
            
            {/* Color preferences */}
            <div>
              <h3 className="text-sm text-zinc-400 mb-3">color preference</h3>
              <ColorPalette
                colors={colors}
                selectedColor={selectedColor}
                onSelectColor={setSelectedColor}
                className="mb-2"
              />
              <p className="text-xs text-zinc-500 italic">
                select colors to influence your outfit suggestions
              </p>
            </div>
          </div>
        </div>
        
        {/* Results */}
        <h2 className="text-2xl mb-4 font-light flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-400" />
          <span>suggested outfits</span>
        </h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : outfits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {outfits.map((outfit) => {
              const outfitItems = getOutfitItems(outfit);
              return (
                <Card key={outfit.id} className="bg-zinc-900 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg font-normal">{outfit.name}</CardTitle>
                    <CardDescription>{outfit.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
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
            <Button onClick={() => setFilters({ occasion: '', season: '', style: '' })}>
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