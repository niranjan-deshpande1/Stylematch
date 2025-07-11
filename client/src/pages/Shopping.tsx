import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ExternalLink, ShoppingCart } from 'lucide-react';
import { ProductRecommendation, ShoppingRecommendationsResponse, clothingCategories } from '@shared/schema';

export default function Shopping() {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
  };

  // Fetch shopping recommendations
  const { data: recommendations, isLoading, error } = useQuery<ShoppingRecommendationsResponse>({
    queryKey: ['/api/shopping/recommendations', debouncedQuery, category],
    enabled: debouncedQuery.length > 2,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('q', debouncedQuery);
      if (category && category !== 'all') params.append('category', category);
      
      const response = await fetch(`/api/shopping/recommendations?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }
      return response.json();
    },
  });

  const handleProductClick = (product: ProductRecommendation) => {
    // Open product link in new tab
    window.open(product.productUrl, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-zinc-300 mb-2">Style Shopping</h1>
          <p className="text-zinc-500">
            Discover fashion pieces that match your style and complete your wardrobe
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search for clothing items (e.g., 'black leather jacket', 'summer dress')"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-300 placeholder-zinc-500"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-zinc-300">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Categories</SelectItem>
                {clothingCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-300"></div>
            <span className="ml-2 text-zinc-400">Finding perfect matches...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">Failed to load recommendations</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-900"
            >
              Try Again
            </Button>
          </div>
        )}

        {recommendations && recommendations.recommendations.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-light text-zinc-300">
                {recommendations.totalCount} recommendations for "{recommendations.searchQuery}"
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recommendations.recommendations.map((product) => (
                <Card 
                  key={product.id} 
                  className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group"
                  onClick={() => handleProductClick(product)}
                >
                  <CardHeader className="p-0">
                    <div className="aspect-square bg-zinc-800 rounded-t-lg overflow-hidden">
                      <img 
                        src={product.imageUrl} 
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-medium text-zinc-300 line-clamp-2">
                            {product.title}
                          </CardTitle>
                          <CardDescription className="text-zinc-500 text-sm">
                            {product.brand}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-zinc-300">
                            ${product.price}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {product.matchScore}% match
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-zinc-400 line-clamp-2">
                        {product.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {product.styleTags.slice(0, 3).map((tag) => (
                          <Badge 
                            key={tag} 
                            variant="secondary" 
                            className="text-xs bg-zinc-800 text-zinc-400 border-zinc-700"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="pt-2 border-t border-zinc-800">
                        <p className="text-xs text-zinc-500">
                          {product.matchReason}
                        </p>
                      </div>
                      
                      <Button 
                        className="w-full mt-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProductClick(product);
                        }}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        View Product
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {debouncedQuery && recommendations && recommendations.recommendations.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl text-zinc-300 mb-2">No recommendations found</h3>
            <p className="text-zinc-500 mb-4">
              Try adjusting your search terms or removing filters
            </p>
          </div>
        )}

        {!debouncedQuery && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl text-zinc-300 mb-2">Start Shopping</h3>
            <p className="text-zinc-500">
              Search for clothing items to get AI-powered style recommendations
            </p>
          </div>
        )}
      </div>
    </div>
  );
}