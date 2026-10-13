import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Shirt, Trash2 } from "lucide-react";
import { clothingCategories, type ClothingItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteClothingItem, getClosetCounts, getClosetItems } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

export default function Closet() {
  const [category, setCategory] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["/api/closet", category],
    queryFn: () => getClosetItems(category),
  });
  const { data: counts = {} } = useQuery({ queryKey: ["/api/closet/counts"], queryFn: getClosetCounts });

  const deleteMutation = useMutation({
    mutationFn: deleteClothingItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/closet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/closet/counts"] });
      toast({ title: "item deleted" });
    },
    onError: (error) => toast({ title: "couldn't delete item", description: error.message, variant: "destructive" }),
  });

  const tabClass = (active: boolean) =>
    `whitespace-nowrap border border-zinc-800 px-4 py-2 text-sm transition-colors ${
      active ? "bg-zinc-800 text-zinc-300" : "bg-black text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
    }`;

  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-light text-zinc-300">your closet</h1>
          <Button asChild className="border border-zinc-800 bg-black px-6 text-sm text-zinc-300 hover:bg-zinc-900">
            <Link href="/closet-upload">
              <Plus className="mr-2 h-4 w-4" /> add items
            </Link>
          </Button>
        </div>

        <div className="mb-6 flex space-x-3 overflow-x-auto pb-4">
          <button className={tabClass(category === null)} onClick={() => setCategory(null)}>
            all items ({counts.all ?? 0})
          </button>
          {clothingCategories.map((c) => (
            <button key={c} className={tabClass(category === c)} onClick={() => setCategory(c)}>
              {c} ({counts[c] ?? 0})
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center border border-zinc-800 bg-zinc-900">
            <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ClosetCard
                key={item.id}
                item={item}
                onDelete={() => {
                  if (window.confirm("delete this item from your closet?")) deleteMutation.mutate(item.id);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="border border-zinc-800 bg-zinc-900 py-16 text-center">
            <Shirt className="mx-auto mb-4 h-10 w-10 text-zinc-700" />
            <h3 className="mb-2 text-xl font-light text-zinc-300">
              {category ? `no ${category} yet` : "your closet is empty"}
            </h3>
            <p className="mb-6 text-zinc-500">start by adding some clothing items</p>
            <Button asChild className="border border-zinc-800 bg-black px-6 text-sm text-zinc-300 hover:bg-zinc-900">
              <Link href="/closet-upload">add clothing items</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function ClosetCard({ item, onDelete }: { item: ClothingItem; onDelete: () => void }) {
  return (
    <div className="group overflow-hidden border border-zinc-800 bg-zinc-900">
      <div className="relative aspect-square overflow-hidden">
        <img src={item.imageUrl} alt={item.category} className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-start justify-end p-2 transition-colors sm:items-center sm:justify-center sm:bg-black/0 sm:p-0 sm:opacity-0 sm:group-hover:bg-black/60 sm:group-hover:opacity-100">
          <button
            onClick={onDelete}
            aria-label="delete item"
            className="rounded-full border border-zinc-700 bg-black p-3 text-red-400 transition-colors hover:bg-zinc-900"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="mb-2 text-zinc-300">{item.category}</h3>
        <div className="flex flex-wrap gap-2">
          {(item.styleTags ?? []).slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs text-zinc-500">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
