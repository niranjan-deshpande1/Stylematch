import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { ClothingItem } from '@shared/schema';
import { Button } from '@/components/ui/button';

export default function OutfitIdeas() {
  const [location] = useLocation();
  const [tags, setTags] = useState<string[]>([]);
  
  // Extract tags from URL query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1]);
    const tagParam = searchParams.get('tags');
    if (tagParam) {
      setTags(tagParam.split(','));
    }
  }, [location]);

  // Fetch all clothing items
  const { data: clothingItems = [], isLoading } = useQuery<ClothingItem[]>({
    queryKey: ['/api/closet'],
    enabled: true,
  });

  // Filter clothing items that match any of the tags
  const matchingItems = clothingItems.filter(item => {
    if (!item.styleTags || tags.length === 0) return false;
    return item.styleTags.some((tag: string) => tags.includes(tag.toLowerCase()));
  });

  return (
    <section className="container mx-auto py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-zinc-300 text-3xl mb-2 font-light">matching items in your closet</h1>
        
        <div className="flex gap-2 flex-wrap mb-6">
          {tags.map(tag => (
            <div key={tag} className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full">
              {tag}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : matchingItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {matchingItems.map(item => (
              <div key={item.id} className="bg-zinc-900 border border-zinc-800 overflow-hidden">
                <div className="aspect-square relative overflow-hidden">
                  <img 
                    src={item.imageUrl} 
                    alt={item.category} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-zinc-300 mb-2">{item.category}</h3>
                  <div className="flex gap-2 flex-wrap">
                    {item.styleTags?.map((tag: string) => (
                      <span key={tag} className="text-xs text-zinc-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-zinc-900 border border-zinc-800">
            <p className="text-zinc-400 mb-4">no matching items found in your closet</p>
            <Button 
              className="bg-black hover:bg-zinc-900 text-zinc-300 border border-zinc-800 text-sm"
              asChild
            >
              <a href="/closet-upload">add items to your closet</a>
            </Button>
          </div>
        )}
        
        <div className="mt-8">
          <Button 
            className="bg-transparent hover:bg-zinc-900 text-zinc-500 border border-zinc-800 text-sm"
            asChild
          >
            <a href="/">← back to home</a>
          </Button>
        </div>
      </div>
    </section>
  );
}