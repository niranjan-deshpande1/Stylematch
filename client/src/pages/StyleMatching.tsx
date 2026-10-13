import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2, Sparkles, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getClosetItems, getStyleMatch } from "@/lib/api";

export default function StyleMatching() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [, navigate] = useLocation();

  const match = useQuery({
    queryKey: ["/api/inspiration", id, "matching"],
    queryFn: () => getStyleMatch(id),
    enabled: Number.isInteger(id),
  });
  const closet = useQuery({ queryKey: ["/api/closet", null], queryFn: () => getClosetItems() });

  // Animate the score bar from 0 once the score arrives.
  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    if (!match.data) return;
    const timer = setTimeout(() => setBarWidth(match.data.matchScore), 100);
    return () => clearTimeout(timer);
  }, [match.data]);

  const matchingItems = (closet.data ?? []).filter((item) => match.data?.matchingItems.includes(item.id));

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate("/inspiration")} aria-label="back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-light">style matches</h1>
        </div>

        {match.isLoading || closet.isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-zinc-500" />
          </div>
        ) : match.error ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 py-12 text-center">
            <p className="mb-6 text-zinc-400">{match.error.message}</p>
            <Button asChild variant="outline" className="border-zinc-700">
              <Link href="/inspiration">back to inspiration</Link>
            </Button>
          </div>
        ) : match.data ? (
          <>
            <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-light">how much of this look you already own</h2>
                <div className="flex items-center rounded-full bg-zinc-800 px-3 py-1">
                  <Sparkles className="mr-2 h-5 w-5 text-yellow-400" />
                  <span className="text-lg font-medium">{match.data.matchScore}%</span>
                </div>
              </div>
              <div className="mb-5 h-4 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-zinc-200 transition-all duration-1000 ease-out"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              {match.data.missingTags.length > 0 && (
                <p className="text-sm text-zinc-400">
                  not in your closet yet: {match.data.missingTags.join(", ")}
                </p>
              )}
            </div>

            <h2 className="mb-4 text-xl font-light">matching items in your closet</h2>
            {matchingItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {matchingItems.map((item) => (
                  <Card key={item.id} className="hover-lift overflow-hidden border-zinc-800 bg-zinc-900">
                    <div className="aspect-square overflow-hidden">
                      <img src={item.imageUrl} alt={item.category} className="h-full w-full object-cover" />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="mb-2 font-light text-zinc-300">{item.category}</h3>
                      <div className="flex flex-wrap gap-2">
                        {(item.styleTags ?? []).slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="border-zinc-700 text-zinc-400">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 py-12 text-center">
                <Tag className="mx-auto mb-4 h-16 w-16 text-zinc-700" />
                <h3 className="mb-2 text-xl">no matching items yet</h3>
                <p className="mx-auto mb-6 max-w-md text-zinc-500">add clothes to your closet that fit this style.</p>
                <Button asChild variant="outline" className="border-zinc-700">
                  <Link href="/closet-upload">add to closet</Link>
                </Button>
              </div>
            )}

            <div className="mb-6 mt-12 flex flex-col gap-4 sm:flex-row">
              <Button asChild variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                <Link href={`/inspiration/${id}/missing-pieces`}>
                  <Tag className="mr-2 h-4 w-4" /> find missing pieces
                </Link>
              </Button>
              {matchingItems.length > 0 && (
                <Button asChild className="bg-white text-black hover:bg-zinc-200">
                  <Link href="/outfit-creator">
                    <Sparkles className="mr-2 h-4 w-4" /> create outfit
                  </Link>
                </Button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
