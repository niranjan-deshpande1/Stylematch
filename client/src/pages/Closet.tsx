import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { deleteClothingItem } from '@/lib/api';
import { clothingCategories, ClothingItem } from '@shared/schema';

export default function Closet() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch clothing items
  const { data: clothingItems = [], isLoading } = useQuery<ClothingItem[]>({
    queryKey: [selectedCategory ? `/api/closet?category=${selectedCategory}` : '/api/closet'],
  });

  // Fetch category counts
  interface CategoryCounts {
    all: number;
    [key: string]: number;
  }
  
  const { data: categoryCounts = { all: 0 } as CategoryCounts } = useQuery<CategoryCounts>({
    queryKey: ['/api/categories'],
  });
  
  // Delete clothing item mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteClothingItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/closet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      
      toast({
        title: "Item deleted",
        description: "The clothing item has been removed from your closet.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteItem = (item: ClothingItem) => {
    deleteMutation.mutate(item.id);
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl text-zinc-300 font-light">your closet</h1>
          <Link href="/closet-upload">
            <Button className="bg-black hover:bg-zinc-900 text-zinc-300 border border-zinc-800 text-sm px-6">
              <i className="fas fa-plus mr-2"></i> add items
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          {/* Categories */}
          <div className="flex overflow-x-auto space-x-3 pb-4">
            <button 
              className={`px-4 py-2 ${!selectedCategory ? 'bg-zinc-800 text-zinc-300' : 'bg-black text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'} border border-zinc-800 text-sm whitespace-nowrap transition-colors`}
              onClick={() => setSelectedCategory(null)}
            >
              all items ({categoryCounts.all || 0})
            </button>
            
            {clothingCategories.map(category => {
              const count = categoryCounts[category as keyof typeof categoryCounts] || 0;
              return (
                <button 
                  key={category}
                  className={`px-4 py-2 ${selectedCategory === category ? 'bg-zinc-800 text-zinc-300' : 'bg-black text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'} border border-zinc-800 text-sm whitespace-nowrap transition-colors`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>

          {/* Closet Grid */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64 bg-zinc-900 border border-zinc-800">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-300"></div>
            </div>
          ) : clothingItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {clothingItems.map((item: ClothingItem) => (
                <div key={item.id} className="bg-zinc-900 border border-zinc-800 overflow-hidden group">
                  <div className="aspect-square relative overflow-hidden">
                    <img 
                      src={item.imageUrl} 
                      alt={item.category} 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button 
                        className="p-3 bg-black border border-zinc-700 rounded-full text-red-400 hover:bg-zinc-900 transition-colors"
                        onClick={() => handleDeleteItem(item)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-zinc-300 mb-2">{item.category}</h3>
                    <div className="flex flex-wrap gap-2">
                      {item.styleTags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="text-xs text-zinc-500">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-zinc-900 border border-zinc-800">
              <i className="fas fa-tshirt text-4xl text-zinc-700 mb-4"></i>
              <h3 className="text-xl text-zinc-300 mb-2 font-light">your closet is empty</h3>
              <p className="text-zinc-500 mb-6">
                start by adding some clothing items to your closet
              </p>
              <Link href="/closet-upload">
                <Button className="bg-black hover:bg-zinc-900 text-zinc-300 border border-zinc-800 text-sm px-6">
                  add clothing items
                </Button>
              </Link>
            </div>
          )}

          {clothingItems.length > 0 && clothingItems.length >= 20 && (
            <div className="mt-8 text-center">
              <Button className="bg-black hover:bg-zinc-900 text-zinc-300 border border-zinc-800 text-sm px-6">
                load more items
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
