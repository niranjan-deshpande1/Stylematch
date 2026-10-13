import { useState } from "react";
import { Link } from "wouter";
import { Loader2, Shirt, Trash2 } from "lucide-react";
import { clothingCategories } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { analyzeClothingItem, deleteClothingItem, uploadClothingItem } from "@/lib/api";
import { removeBackground } from "@/lib/imageProcessing";
import { queryClient } from "@/lib/queryClient";

type Status = "processing" | "uploading" | "analyzing" | "done" | "error";

interface Upload {
  key: string;
  previewUrl: string;
  status: Status;
  itemId?: number;
  tags: string[];
}

const STATUS_LABEL: Partial<Record<Status, string>> = {
  processing: "removing background...",
  uploading: "uploading...",
  analyzing: "tagging...",
};

export default function ClosetUpload() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [category, setCategory] = useState<string>("tops");
  const { toast } = useToast();

  const update = (key: string, changes: Partial<Upload>) =>
    setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, ...changes } : u)));

  // Each photo goes through: background removal (in the browser) -> upload -> AI tagging.
  async function processFile(file: File) {
    const key = crypto.randomUUID();
    const originalPreview = URL.createObjectURL(file);
    setUploads((prev) => [...prev, { key, previewUrl: originalPreview, status: "processing", tags: [] }]);
    let step = "upload";

    try {
      const cleaned = await removeBackground(file);
      URL.revokeObjectURL(originalPreview);
      update(key, { status: "uploading", previewUrl: URL.createObjectURL(cleaned) });

      const item = await uploadClothingItem(cleaned, category);
      update(key, { status: "analyzing", itemId: item.id });

      step = "tagging";
      const tagged = await analyzeClothingItem(item.id);
      update(key, { status: "done", tags: tagged.styleTags ?? [] });
    } catch (error) {
      update(key, { status: "error" });
      toast({
        // If tagging fails the photo is still saved, so say which part went wrong.
        title: step === "tagging" ? "saved, but tagging failed" : "upload failed",
        description: error instanceof Error ? error.message : "something went wrong",
        variant: "destructive",
      });
    } finally {
      queryClient.invalidateQueries({ queryKey: ["/api/closet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/closet/counts"] });
    }
  }

  async function remove(upload: Upload) {
    try {
      if (upload.itemId) await deleteClothingItem(upload.itemId);
      setUploads((prev) => prev.filter((u) => u.key !== upload.key));
      URL.revokeObjectURL(upload.previewUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/closet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/closet/counts"] });
    } catch {
      toast({ title: "couldn't delete item", variant: "destructive" });
    }
  }

  return (
    <section className="border-t border-zinc-800 py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 className="gradient-text mb-6 text-2xl">add to your closet</h2>
        <p className="mb-8 text-zinc-400">
          upload photos of your clothes. we remove the background and tag each item automatically.
        </p>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="flex flex-col">
            <label htmlFor="category" className="mb-2 block text-sm font-medium text-zinc-400">
              category
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" className="mb-4 w-full border-zinc-700 bg-zinc-900 text-zinc-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-300">
                {clothingCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <FileInput
              multiple
              onFilesSelected={(files) => files.forEach(processFile)}
              className="dark-card h-80"
              icon={<Shirt className="mb-2 h-8 w-8 text-zinc-500" />}
              label="drop your clothing photos here"
              sublabel="backgrounds are removed automatically"
              buttonText="select images"
            />
          </div>

          <div className="dark-card min-h-[400px] overflow-hidden">
            <div className="border-b border-zinc-800 p-4">
              <h3 className="text-lg text-zinc-300">recently added</h3>
              <p className="text-sm text-zinc-500">each item is tagged by style after upload</p>
            </div>

            {uploads.length > 0 ? (
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {uploads.map((upload) => (
                    <div key={upload.key} className="group relative">
                      <div className="relative aspect-square overflow-hidden rounded-md border border-zinc-800 bg-black">
                        <img src={upload.previewUrl} alt="clothing item" className="h-full w-full object-cover" />
                        {STATUS_LABEL[upload.status] && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
                            <Loader2 className="h-7 w-7 animate-spin" />
                            <span className="mt-2 text-xs">{STATUS_LABEL[upload.status]}</span>
                          </div>
                        )}
                        {(upload.status === "done" || upload.status === "error") && (
                          <button
                            onClick={() => remove(upload)}
                            aria-label="delete item"
                            className="absolute right-2 top-2 rounded-full border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {upload.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                            {tag}
                          </span>
                        ))}
                        {upload.status === "error" && (
                          <span className="rounded-full border border-red-800 bg-red-900 px-2 py-0.5 text-xs text-red-200">
                            error
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Button asChild className="mt-6 w-full border border-zinc-800 bg-black py-6 text-white hover:bg-zinc-900">
                  <Link href="/closet">view your full closet</Link>
                </Button>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <Shirt className="mb-4 h-10 w-10 text-zinc-700" />
                <p className="text-zinc-500">upload clothing items to see them here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
