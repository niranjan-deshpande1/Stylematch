import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Info, Loader2, Tag } from "lucide-react";
import type { MissingPiece } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInspirationImage, getMissingPieces } from "@/lib/api";
import { cn } from "@/lib/utils";

const IMPORTANCE_STYLES: Record<MissingPiece["importance"], { badge: string; border: string }> = {
  high: { badge: "bg-rose-500/20 text-rose-200", border: "border-l-rose-500/50" },
  medium: { badge: "bg-amber-500/20 text-amber-200", border: "border-l-amber-500/50" },
  low: { badge: "bg-emerald-500/20 text-emerald-200", border: "border-l-emerald-500/50" },
};

export default function MissingPieces() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const image = useQuery({
    queryKey: ["/api/inspiration", id],
    queryFn: () => getInspirationImage(id),
    enabled: Number.isInteger(id),
  });
  // The server saves this answer, so refetching it doesn't call the AI again.
  const pieces = useQuery({
    queryKey: ["/api/inspiration", id, "missing-pieces"],
    queryFn: () => getMissingPieces(id),
    enabled: Number.isInteger(id),
    staleTime: Infinity,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center">
        <Button asChild variant="ghost" size="sm" className="mr-2 text-zinc-400 hover:text-zinc-200">
          <Link href="/inspiration">
            <ArrowLeft className="mr-1 h-4 w-4" /> back
          </Link>
        </Button>
        <h1 className="text-2xl font-light tracking-tight">
          <span className="gradient-text">missing pieces</span>
        </h1>
      </div>

      {image.data && (
        <Card className="mb-8 overflow-hidden border-zinc-800 bg-zinc-900">
          <div className="flex flex-col md:flex-row">
            <div className="relative h-60 w-full bg-black md:h-auto md:w-1/3">
              <img src={image.data.imageUrl} alt="inspiration" className="absolute inset-0 h-full w-full object-contain" />
            </div>
            <div className="w-full p-6 md:w-2/3">
              <h2 className="mb-3 text-xl font-light">your inspiration</h2>
              <div className="mb-4 flex flex-wrap gap-2">
                {(image.data.styleTags ?? []).map((tag) => (
                  <Badge key={tag} className="bg-zinc-800 text-zinc-400 hover:bg-zinc-700">
                    {tag}
                  </Badge>
                ))}
              </div>
              {(image.data.styleTags ?? []).length > 0 && (
                <Button asChild variant="outline" size="sm" className="border-zinc-700">
                  <Link href={`/inspiration/${id}/style-matching`}>
                    <Tag className="mr-2 h-4 w-4" /> match with closet
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {pieces.isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <Loader2 className="mb-4 h-10 w-10 animate-spin" />
          comparing this look with your closet...
        </div>
      ) : pieces.error ? (
        <Card className="mt-8 border-zinc-800 bg-zinc-900">
          <CardContent className="py-12 text-center">
            <Info className="mx-auto mb-6 h-10 w-10 text-rose-400" />
            <h2 className="mb-3 text-2xl font-light">couldn't load recommendations</h2>
            <p className="mx-auto mb-8 max-w-md text-zinc-400">{pieces.error.message}</p>
            <Button onClick={() => pieces.refetch()} className="border border-zinc-800 bg-black text-zinc-300 hover:bg-zinc-900">
              try again
            </Button>
          </CardContent>
        </Card>
      ) : pieces.data && pieces.data.length > 0 ? (
        <>
          <p className="mb-8 max-w-3xl text-zinc-400">
            based on this look and what's already in your closet, here's what you'd need to complete it:
          </p>
          <div className="grid gap-6">
            {pieces.data.map((piece) => (
              <PieceCard key={`${piece.category}-${piece.description}`} piece={piece} />
            ))}
          </div>
        </>
      ) : (
        <Card className="mt-8 border-zinc-800 bg-zinc-900">
          <CardContent className="py-12 text-center">
            <Check className="mx-auto mb-6 h-10 w-10 text-emerald-400" />
            <h2 className="mb-3 text-2xl font-light">
              <span className="gradient-text">your closet has this covered</span>
            </h2>
            <p className="mx-auto mb-8 max-w-md text-zinc-400">you already own everything this look needs</p>
            <Button asChild className="border border-zinc-800 bg-black text-zinc-300 hover:bg-zinc-900">
              <Link href="/outfit-creator">create outfits</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PieceCard({ piece }: { piece: MissingPiece }) {
  const style = IMPORTANCE_STYLES[piece.importance];

  return (
    <Card className={cn("overflow-hidden border-l-4 border-zinc-800 bg-zinc-900", style.border)}>
      <CardHeader className="pb-3">
        <Badge className={cn("mb-3 w-fit font-normal", style.badge)}>{piece.importance} priority</Badge>
        <CardTitle className="mb-2 text-xl font-light">{piece.description}</CardTitle>
        <CardDescription className="text-zinc-400">{piece.category}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-zinc-300">
          <span className="pr-2 text-zinc-500">why:</span>
          {piece.reason}
        </p>

        {piece.searchTerms && piece.searchTerms.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-2 font-medium text-zinc-300">search suggestions</h4>
            <div className="flex flex-wrap gap-2">
              {piece.searchTerms.map((term) => (
                <a
                  key={term}
                  href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(term)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
                >
                  {term}
                </a>
              ))}
            </div>
          </div>
        )}

        {piece.whereToBuy && (
          <div className="mb-6">
            <h4 className="mb-2 font-medium text-zinc-300">where to buy</h4>
            <p className="text-sm text-zinc-400">{piece.whereToBuy}</p>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
