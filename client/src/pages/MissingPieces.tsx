import { useQuery } from "@tanstack/react-query";
import { getMissingPieceRecommendations } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Info, Check, ExternalLink, Tag } from "lucide-react";
import type { MissingPiece, ProductExample } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function MissingPieces() {
  const { toast } = useToast();
  const [, params] = useRoute("/inspiration/:id/missing-pieces");
  const inspirationId = params?.id ? parseInt(params.id) : null;

  // Get the inspiration image
  const { 
    data: inspirationImage,
    isLoading: isLoadingInspirationImage
  } = useQuery({
    queryKey: ['/api/inspiration', inspirationId],
    queryFn: async () => {
      if (!inspirationId) throw new Error("No inspiration ID provided");
      const res = await apiRequest("GET", `/api/inspiration/${inspirationId}`);
      return res.json();
    },
    enabled: !!inspirationId,
  });

  // Get missing pieces recommendations
  const { 
    data: missingPieces,
    isLoading: isLoadingMissingPieces,
    error
  } = useQuery({
    queryKey: ['/api/inspiration', inspirationId, 'missing-pieces'],
    queryFn: () => {
      if (!inspirationId) throw new Error("No inspiration ID provided");
      return getMissingPieceRecommendations(inspirationId);
    },
    enabled: !!inspirationId,
  });
  
  const isLoading = isLoadingMissingPieces || isLoadingInspirationImage;

  if (!inspirationId) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-xl mx-auto bg-gradient-to-br from-zinc-900 to-zinc-900/80 border border-zinc-800 rounded-lg p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-6">
            <Info className="h-10 w-10 text-zinc-400" />
          </div>
          <h1 className="text-2xl mb-4 font-light">no inspiration selected</h1>
          <p className="text-zinc-400 mb-8 max-w-md mx-auto">
            please select an inspiration image to get missing piece recommendations
          </p>
          <Link href="/inspiration">
            <Button className="bg-black hover:bg-zinc-900 text-zinc-300 border border-zinc-800 px-6 py-5 text-sm">
              browse inspiration images
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center">
          <Link href="/inspiration">
            <Button variant="ghost" size="sm" className="mr-2 text-zinc-400 hover:text-zinc-200">
              <ArrowLeft className="h-4 w-4 mr-1" />
              back
            </Button>
          </Link>
          <h1 className="text-2xl font-light tracking-tight">
            <span className="gradient-text">missing pieces</span>
          </h1>
        </div>
        
        <p className="text-zinc-400 mb-8 max-w-3xl">
          analyzing your inspiration image and closet...
        </p>
        
        <div className="grid gap-6 mt-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800 border-l-4 border-l-zinc-700">
              <CardHeader className="pb-3">
                <div className="animate-pulse bg-zinc-800 h-6 w-32 rounded-full mb-4"></div>
                <div className="animate-pulse bg-zinc-800 h-7 w-3/4 rounded-full mb-3"></div>
                <div className="animate-pulse bg-zinc-800 h-5 w-1/3 rounded-full"></div>
              </CardHeader>
              <CardContent className="animate-pulse py-4">
                <div className="h-4 bg-zinc-800 rounded-full w-full mb-2"></div>
                <div className="h-4 bg-zinc-800 rounded-full w-full mb-2"></div>
                <div className="h-4 bg-zinc-800 rounded-full w-3/4 mb-6"></div>
                
                {/* Product examples skeleton */}
                <div className="mt-8 mb-6">
                  <div className="h-5 bg-zinc-800 rounded-full w-40 mb-4"></div>
                  <div className="space-y-4">
                    {[1, 2].map((j) => (
                      <div key={j} className="p-4 bg-zinc-800 rounded-lg">
                        <div className="h-4 bg-zinc-700 rounded-full w-48 mb-3"></div>
                        <div className="h-3 bg-zinc-700 rounded-full w-full mb-2"></div>
                        <div className="h-3 bg-zinc-700 rounded-full w-2/3 mb-4"></div>
                        <div className="flex gap-2">
                          <div className="h-6 bg-zinc-700 rounded-md w-20"></div>
                          <div className="h-6 bg-zinc-700 rounded-md w-24"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Search terms skeleton */}
                <div className="mb-6">
                  <div className="h-5 bg-zinc-800 rounded-full w-48 mb-4"></div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-7 bg-zinc-800 rounded-full w-24"></div>
                    ))}
                  </div>
                </div>
                
                {/* Where to buy skeleton */}
                <div className="mb-6">
                  <div className="h-5 bg-zinc-800 rounded-full w-32 mb-4"></div>
                  <div className="h-4 bg-zinc-800 rounded-full w-full mb-2"></div>
                  <div className="h-4 bg-zinc-800 rounded-full w-4/5"></div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <div className="h-8 bg-zinc-800 rounded-md w-36"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    toast({
      title: "error loading recommendations",
      description: "failed to load missing piece recommendations",
      variant: "destructive"
    });
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center">
          <Link href="/inspiration">
            <Button variant="ghost" size="sm" className="mr-2 text-zinc-400 hover:text-zinc-200">
              <ArrowLeft className="h-4 w-4 mr-1" />
              back
            </Button>
          </Link>
          <h1 className="text-2xl font-light tracking-tight">
            <span className="gradient-text">missing pieces</span>
          </h1>
        </div>
        
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-900/80 border-zinc-800 hover:border-zinc-700 transition-all duration-300 mt-8">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6">
                <Info className="h-10 w-10 text-rose-400" />
              </div>
              <h2 className="text-2xl mb-3 font-light">could not load recommendations</h2>
              <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                there was an error retrieving the missing piece recommendations
              </p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-black hover:bg-zinc-900 text-zinc-300 border border-zinc-800 px-6 py-5 text-sm"
              >
                try again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const importanceBadgeClasses = (importance: string) => {
    switch (importance) {
      case 'high':
        return 'bg-rose-500/20 text-rose-200 hover:bg-rose-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30';
      case 'low':
        return 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30';
      default:
        return 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center">
        <Link href="/inspiration">
          <Button variant="ghost" size="sm" className="mr-2 text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="h-4 w-4 mr-1" />
            back
          </Button>
        </Link>
        <h1 className="text-2xl font-light tracking-tight">
          <span className="gradient-text">missing pieces</span>
        </h1>
      </div>
      
      {/* Inspiration Image Card */}
      {inspirationImage && (
        <div className="mb-8">
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-1/3 h-60 md:h-auto bg-black relative">
                <img 
                  src={inspirationImage.imageUrl} 
                  alt="Inspiration" 
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
              <div className="w-full md:w-2/3 p-6">
                <h2 className="text-xl mb-3 font-light">inspiration #{inspirationImage.id}</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {inspirationImage.styleTags && inspirationImage.styleTags.map((tag, idx) => (
                    <Badge key={idx} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-3">
                  <Link href={`/inspiration/${inspirationId}/style-matching`}>
                    <Button variant="outline" size="sm" className="border-zinc-700">
                      <Tag className="h-4 w-4 mr-2" />
                      match with closet
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <p className="text-zinc-400 mb-8 max-w-3xl">
        based on your inspiration image and existing closet, here are the pieces we recommend adding to complete your look:
      </p>

      {missingPieces && missingPieces.length > 0 ? (
        <div className="grid gap-6 mt-4">
          {missingPieces.map((piece: MissingPiece, index: number) => (
            <Card 
              key={index} 
              className={cn(
                "bg-zinc-900 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all duration-300",
                piece.importance === 'high' ? "border-l-4 border-l-rose-500/50" : 
                piece.importance === 'medium' ? "border-l-4 border-l-amber-500/50" : 
                "border-l-4 border-l-emerald-500/50"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge 
                      className={cn("uppercase font-normal mb-3", importanceBadgeClasses(piece.importance))}
                    >
                      {piece.importance} priority
                    </Badge>
                    <CardTitle className="text-xl mb-2 font-light">{piece.description}</CardTitle>
                    <CardDescription className="text-zinc-400">
                      {piece.category}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-300 mb-4">
                  <span className="text-zinc-500 inline-block pr-2">why:</span>
                  {piece.reason}
                </p>
                
                {piece.examples && piece.examples.length > 0 && (
                  <>
                    <h4 className="text-zinc-300 font-medium mb-2 mt-6">product examples</h4>
                    <div className="space-y-3 mb-6">
                      {piece.examples.map((example, idx) => (
                        <Card key={idx} className="bg-zinc-800 border-zinc-700 overflow-hidden">
                          <CardContent className="p-4">
                            <h5 className="text-zinc-200 font-medium text-sm mb-1">{example.name}</h5>
                            {example.description && (
                              <p className="text-zinc-400 text-xs mb-2">{example.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {example.where && (
                                <Badge variant="outline" className="text-xs bg-zinc-700/50 text-zinc-300 border-zinc-600">
                                  {example.where}
                                </Badge>
                              )}
                              {example.price && (
                                <Badge variant="outline" className="text-xs bg-zinc-700/50 text-zinc-300 border-zinc-600">
                                  {example.price}
                                </Badge>
                              )}
                            </div>
                            {example.link && (
                              <div className="mt-3">
                                <a 
                                  href={example.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
                                >
                                  view product →
                                </a>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
                
                {piece.searchTerms && piece.searchTerms.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-zinc-300 font-medium mb-2">search suggestions</h4>
                    <div className="flex flex-wrap gap-2">
                      {piece.searchTerms.map((term, idx) => (
                        <Badge 
                          key={idx}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                          onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(term)}`, '_blank')}
                        >
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {piece.wheretoBuy && (
                  <div className="mb-6">
                    <h4 className="text-zinc-300 font-medium mb-2">where to buy</h4>
                    <p className="text-zinc-400 text-sm">{piece.wheretoBuy}</p>
                  </div>
                )}
                
                <div className="flex justify-end mt-6">
                  <Link href="/closet">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                    >
                      check my closet
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-900/80 border-zinc-800 hover:border-zinc-700 transition-all duration-300 mt-8">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                <Check className="h-10 w-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl mb-3 font-light">
                <span className="gradient-text">your closet is complete!</span>
              </h2>
              <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                you already have all the pieces needed for this look
              </p>
              <Link href="/outfit-ideas">
                <Button className="bg-black hover:bg-zinc-900 text-zinc-300 border border-zinc-800 px-6 py-5 text-sm">
                  browse outfit ideas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}