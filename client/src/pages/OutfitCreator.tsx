import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calendar, Loader2, Shirt, Sparkles, Sun, Tags } from "lucide-react";
import { outfitSeasons, outfitThemes, type ClothingItem, type Outfit } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getClosetItems, getOutfits } from "@/lib/api";

export default function OutfitCreator() {
  const [season, setSeason] = useState("");
  const [theme, setTheme] = useState("");

  const closet = useQuery({ queryKey: ["/api/closet", null], queryFn: () => getClosetItems() });
  const generate = useMutation({ mutationFn: getOutfits });

  const itemsById = new Map((closet.data ?? []).map((item) => [item.id, item]));
  const toggle = (current: string, value: string) => (current === value ? "" : value);

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-light">outfit ideas</h1>
        <p className="mb-8 text-zinc-400">combinations built only from clothes already in your closet</p>

        <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-zinc-300">
            <Tags className="h-5 w-5" /> filters
          </h2>

          <FilterGroup
            title="season"
            options={outfitSeasons.map((s) => ({ id: s.id, label: s.name }))}
            selected={season}
            onSelect={(id) => setSeason(toggle(season, id))}
          />
          <FilterGroup
            title="style theme"
            options={outfitThemes.map((t) => ({ id: t.id, label: t.name, hint: t.description }))}
            selected={theme}
            onSelect={(id) => setTheme(toggle(theme, id))}
          />

          <Button
            className="mt-6 w-full bg-white text-black hover:bg-zinc-200"
            onClick={() => generate.mutate({ season, theme })}
            disabled={generate.isPending || closet.isLoading}
          >
            {generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {generate.isPending ? "putting outfits together..." : "generate outfits"}
          </Button>
        </div>

        {generate.error ? (
          <EmptyState message={generate.error.message} />
        ) : generate.data ? (
          generate.data.outfits.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {generate.data.outfits.map((outfit) => (
                <OutfitCard key={outfit.id} outfit={outfit} items={outfit.items.map((id) => itemsById.get(id)).filter(isItem)} />
              ))}
            </div>
          ) : (
            <EmptyState message={generate.data.message ?? "no outfits this time. try different filters."} />
          )
        ) : closet.data && closet.data.length === 0 ? (
          <EmptyState message="your closet is empty. add some clothes first." showUpload />
        ) : null}
      </div>
    </section>
  );
}

function isItem(item: ClothingItem | undefined): item is ClothingItem {
  return item !== undefined;
}

interface FilterGroupProps {
  title: string;
  options: { id: string; label: string; hint?: string }[];
  selected: string;
  onSelect: (id: string) => void;
}

function FilterGroup({ title, options, selected, onSelect }: FilterGroupProps) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="mb-3 text-sm text-zinc-400">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.id}
            size="sm"
            title={option.hint}
            variant={selected === option.id ? "default" : "outline"}
            className={selected === option.id ? "hover:bg-zinc-700" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"}
            onClick={() => onSelect(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function OutfitCard({ outfit, items }: { outfit: Outfit; items: ClothingItem[] }) {
  return (
    <Card className="overflow-hidden border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
      <CardHeader>
        <CardTitle className="text-lg font-normal">{outfit.name}</CardTitle>
        <CardDescription>{outfit.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-3 overflow-x-auto pb-2">
          {items.map((item) => (
            <div key={item.id} className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-zinc-800">
              <img src={item.imageUrl} alt={item.category} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
          {outfit.style && <Chip icon={<Shirt className="h-3 w-3" />} label={outfit.style} />}
          {outfit.occasion && <Chip icon={<Calendar className="h-3 w-3" />} label={outfit.occasion} />}
          <Chip icon={<Sun className="h-3 w-3" />} label={outfit.season} />
        </div>
      </CardContent>
    </Card>
  );
}

function Chip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1">
      {icon}
      {label}
    </span>
  );
}

function EmptyState({ message, showUpload }: { message: string; showUpload?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 py-12 text-center">
      <Shirt className="mx-auto mb-4 h-16 w-16 text-zinc-700" />
      <p className="mx-auto mb-6 max-w-md text-zinc-400">{message}</p>
      {showUpload && (
        <Button asChild>
          <Link href="/closet-upload">add clothes</Link>
        </Button>
      )}
    </div>
  );
}
