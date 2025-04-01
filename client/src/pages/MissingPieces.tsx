import { useQuery } from "@tanstack/react-query";
import { getMissingPieceRecommendations } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Link, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Info, Check } from "lucide-react";
import type { MissingPiece } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function MissingPieces() {
  const { toast } = useToast();
  const [, params] = useRoute("/inspiration/:id/missing-pieces");
  const inspirationId = params?.id ? parseInt(params.id) : null;

  const { 
    data: missingPieces,
    isLoading,
    error
  } = useQuery({
    queryKey: ['/api/inspiration', inspirationId, 'missing-pieces'],
    queryFn: () => {
      if (!inspirationId) throw new Error("No inspiration ID provided");
      return getMissingPieceRecommendations(inspirationId);
    },
    enabled: !!inspirationId,
  });

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
                <div className="flex justify-end">
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
                <div className="flex justify-end">
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