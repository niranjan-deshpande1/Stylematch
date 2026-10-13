import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bookmark, BookmarkMinus, BookmarkPlus, ImageIcon, ImageOff, Loader2, PlusCircle, Sparkles, Trash } from "lucide-react";
import type { InspirationImage } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  analyzeInspirationImage,
  deleteInspirationImage,
  getInspirationImages,
  toggleInspirationSaved,
} from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

const INSPIRATION_KEY = ["/api/inspiration"];

export default function Inspiration() {
  const { toast } = useToast();
  const [savedOnly, setSavedOnly] = useState(false);
  const { data: images = [], isLoading, error } = useQuery({
    queryKey: INSPIRATION_KEY,
    queryFn: getInspirationImages,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: INSPIRATION_KEY });
  const showError = (title: string) => (err: Error) =>
    toast({ title, description: err.message, variant: "destructive" });

  const deleteMutation = useMutation({
    mutationFn: deleteInspirationImage,
    onSuccess: refresh,
    onError: showError("couldn't delete image"),
  });
  const saveMutation = useMutation({
    mutationFn: toggleInspirationSaved,
    onSuccess: refresh,
    onError: showError("couldn't save image"),
  });
  const analyzeMutation = useMutation({
    mutationFn: analyzeInspirationImage,
    onSuccess: refresh,
    onError: showError("couldn't analyze image"),
  });

  const visible = savedOnly ? images.filter((image) => image.isSaved) : images;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl">inspiration gallery</h1>
          <Button
            size="sm"
            variant="outline"
            className={savedOnly ? "border-zinc-500 text-zinc-200" : "border-zinc-800 text-zinc-500"}
            onClick={() => setSavedOnly(!savedOnly)}
          >
            <Bookmark className="mr-1 h-3 w-3" /> saved only
          </Button>
        </div>
        <Button asChild className="border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">
          <Link href="/inspiration-upload">
            <PlusCircle className="mr-2 h-4 w-4" /> add new
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-zinc-500" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-zinc-400">couldn't load your inspiration images. try refreshing.</p>
      ) : savedOnly && visible.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">nothing saved yet. use the bookmark button on any image.</p>
      ) : images.length === 0 ? (
        <div className="rounded-lg bg-zinc-900 py-16 text-center">
          <ImageOff className="mx-auto mb-6 h-16 w-16 text-zinc-700" />
          <h2 className="mb-2 text-xl">no inspiration images yet</h2>
          <p className="mx-auto mb-8 max-w-md text-zinc-500">
            upload photos of outfits you love to see how close your closet gets you
          </p>
          <Button asChild>
            <Link href="/inspiration-upload">
              <ImageIcon className="mr-2 h-4 w-4" /> upload your first image
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((image) => (
            <InspirationCard
              key={image.id}
              image={image}
              onDelete={() => {
                if (window.confirm("delete this inspiration image?")) deleteMutation.mutate(image.id);
              }}
              onToggleSaved={() => saveMutation.mutate(image.id)}
              onAnalyze={() => analyzeMutation.mutate(image.id)}
              isAnalyzing={analyzeMutation.isPending && analyzeMutation.variables === image.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  image: InspirationImage;
  onDelete: () => void;
  onToggleSaved: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

function InspirationCard({ image, onDelete, onToggleSaved, onAnalyze, isAnalyzing }: CardProps) {
  const tags = image.styleTags ?? [];

  return (
    <Card className="hover-lift overflow-hidden border-zinc-800 bg-zinc-900 transition-all duration-300 hover:border-zinc-700">
      <div className="group relative flex h-60 items-center justify-center overflow-hidden bg-black/20">
        <img
          src={image.imageUrl}
          alt="inspiration outfit"
          className="max-h-60 max-w-full object-contain transition-transform duration-700 group-hover:scale-105"
        />
        <Button
          size="icon"
          variant="ghost"
          aria-label="delete image"
          className="absolute right-2 top-2 h-8 w-8 rounded-full bg-black/50 text-zinc-300 hover:bg-red-900/70 hover:text-white"
          onClick={onDelete}
        >
          <Trash className="h-4 w-4" />
        </Button>
        <div className="absolute bottom-0 right-0 m-3 flex gap-2 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100">
          <Button size="sm" onClick={onToggleSaved} aria-label={image.isSaved ? "unsave" : "save"} className="bg-black/70 text-white hover:bg-black/90">
            {image.isSaved ? <BookmarkMinus className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
          </Button>
          {tags.length > 0 && (
            <Button size="sm" asChild className="bg-black/70 text-white hover:bg-black/90">
              <Link href={`/inspiration/${image.id}/style-matching`}>match with closet</Link>
            </Button>
          )}
        </div>
      </div>
      <CardContent className="py-4">
        <p className="mb-3 text-sm text-zinc-500">
          added {image.createdAt ? new Date(image.createdAt).toLocaleDateString() : ""}
        </p>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} className="bg-zinc-800 text-zinc-400 hover:bg-zinc-700">
                {tag}
              </Badge>
            ))}
          </div>
        ) : (
          <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400" onClick={onAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
            analyze for tags
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
