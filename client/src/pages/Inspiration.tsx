import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Sparkles, ImageOff, ImageIcon, Camera, Trash } from "lucide-react";
import { deleteInspirationImage } from "@/lib/api";
import type { InspirationImage } from "@shared/schema";

export default function Inspiration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: inspirationImages, isLoading, error } = useQuery({
    queryKey: ['/api/inspiration'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/inspiration");
      return res.json() as Promise<InspirationImage[]>;
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteInspirationImage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inspiration'] });
      toast({
        title: "success",
        description: "inspiration image deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "error",
        description: "failed to delete inspiration image",
        variant: "destructive"
      });
    }
  });
  
  const handleDelete = (id: number, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    deleteMutation.mutate(id);
  };

  if (error) {
    toast({
      title: "error",
      description: "failed to load inspiration images",
      variant: "destructive"
    });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl">inspiration gallery</h1>
        <Link href="/inspiration-upload">
          <Button className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300">
            <PlusCircle className="h-4 w-4 mr-2" />
            add new
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800 overflow-hidden">
              <div className="h-60 bg-zinc-800 animate-pulse"></div>
              <CardContent className="py-4">
                <div className="h-6 bg-zinc-800 animate-pulse rounded-full w-1/3 mb-4"></div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-6 bg-zinc-800 animate-pulse rounded-full w-16"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : inspirationImages && inspirationImages.length > 0 ? (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${
          inspirationImages.length === 1 ? 'md:place-items-center md:grid-cols-1' : ''
        }`}>
          {inspirationImages.map((image) => (
            <Card 
              key={image.id} 
              className={`bg-zinc-900 border-zinc-800 overflow-hidden hover-lift animate-fade-in transition-all duration-300 hover:border-zinc-700 ${
                inspirationImages.length === 1 ? 'max-w-md w-full mx-auto' : ''
              }`}
            >
              <div className="relative h-60 bg-zinc-900 overflow-hidden flex justify-center items-center group">
                <div className="w-full h-full flex items-center justify-center bg-black/20">
                  <img 
                    src={image.imageUrl} 
                    alt="Inspiration image" 
                    className="max-w-full max-h-60 object-contain transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute top-2 right-2">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 rounded-full bg-black/50 hover:bg-red-900/70 text-zinc-300 hover:text-white transform transition-transform duration-300 hover:scale-110"
                    onClick={(e) => handleDelete(image.id, e)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 right-0 m-3 flex gap-2 transform translate-y-1 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  <Link href={`/inspiration/${image.id}/style-matching`}>
                    <Button 
                      size="sm" 
                      className="bg-black/70 backdrop-blur-sm hover:bg-black/90 text-white shadow-lg"
                    >
                      <PlusCircle className="h-4 w-4 mr-1" />
                      match with closet
                    </Button>
                  </Link>
                </div>
              </div>
              <CardContent className="py-4">
                <h3 className="text-lg mb-3 font-light">inspiration #{image.id}</h3>
                <div className="flex flex-wrap gap-2">
                  {image.styleTags && image.styleTags.length > 0 ? (
                    image.styleTags.map((tag, index) => (
                      <Badge 
                        key={index} 
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors duration-300"
                      >
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <Link href="/inspiration-upload">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors duration-300"
                      >
                        <Camera className="h-3 w-3 mr-1" />
                        analyze for tags
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-zinc-900 border-zinc-800 rounded-lg">
          <ImageOff className="h-16 w-16 mx-auto mb-6 text-zinc-700" />
          <h2 className="text-xl mb-2">no inspiration images yet</h2>
          <p className="text-zinc-500 mb-8 max-w-md mx-auto">
            upload photos of outfits you love to get style insights and recommendations
          </p>
          <Link href="/inspiration-upload">
            <Button>
              <ImageIcon className="h-4 w-4 mr-2" />
              upload your first image
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}