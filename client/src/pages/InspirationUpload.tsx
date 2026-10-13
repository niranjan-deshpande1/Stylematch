import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { ImageIcon, Loader2, Shirt, Sparkles, UploadCloud } from "lucide-react";
import type { InspirationImage } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { useToast } from "@/hooks/use-toast";
import { analyzeInspirationImage, uploadInspirationImage } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

export default function InspirationUpload() {
  const [image, setImage] = useState<InspirationImage | null>(null);
  const { toast } = useToast();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/inspiration"] });

  const uploadMutation = useMutation({
    mutationFn: uploadInspirationImage,
    onSuccess: (uploaded) => {
      setImage(uploaded);
      refresh();
    },
    onError: (error) => toast({ title: "upload failed", description: error.message, variant: "destructive" }),
  });

  const analyzeMutation = useMutation({
    mutationFn: analyzeInspirationImage,
    onSuccess: (analyzed) => {
      setImage(analyzed);
      refresh();
    },
    onError: (error) => toast({ title: "analysis failed", description: error.message, variant: "destructive" }),
  });

  const tags = image?.styleTags ?? [];

  return (
    <section className="border-t border-zinc-800 py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 className="gradient-text mb-6 text-2xl">upload fit inspiration</h2>
        <p className="mb-8 text-zinc-400">
          share a photo of an outfit you love. we'll tag its style, show which of your clothes match, and point out
          what's missing.
        </p>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="flex flex-col">
            <FileInput
              onFilesSelected={([file]) => uploadMutation.mutate(file)}
              disabled={uploadMutation.isPending}
              className="dark-card h-80"
              icon={<UploadCloud className="mb-2 h-8 w-8 text-zinc-500" />}
              label={uploadMutation.isPending ? "uploading..." : "drop your inspiration photo here"}
            />
            {image && (
              <Button
                className="mt-4 w-full border border-zinc-800 bg-black py-6 text-white hover:bg-zinc-900"
                onClick={() => analyzeMutation.mutate(image.id)}
                disabled={analyzeMutation.isPending}
              >
                {analyzeMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {analyzeMutation.isPending ? "analyzing..." : tags.length ? "re-analyze" : "get style tags"}
              </Button>
            )}
          </div>

          <div className="dark-card h-full overflow-hidden">
            {image ? (
              <>
                <div className="flex h-52 items-center justify-center overflow-hidden bg-black">
                  <img src={image.imageUrl} alt="uploaded inspiration" className="max-h-52 max-w-full object-contain" />
                </div>
                <div className="p-4">
                  <h3 className="mb-3 text-lg text-zinc-300">style tags</h3>
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="italic text-zinc-500">click "get style tags" to analyze this image</p>
                  )}

                  <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
                    {tags.length > 0 && (
                      <Button asChild className="w-full border border-zinc-800 bg-black py-3 text-sm text-zinc-300 hover:bg-zinc-900">
                        <Link href={`/inspiration/${image.id}/style-matching`}>
                          <Shirt className="mr-2 h-4 w-4" /> find matching items in your closet
                        </Link>
                      </Button>
                    )}
                    <Button
                      asChild
                      className="w-full border border-zinc-800 bg-black py-3 text-sm text-zinc-300 hover:bg-zinc-900"
                    >
                      <Link href={`/inspiration/${image.id}/missing-pieces`}>
                        <Sparkles className="mr-2 h-4 w-4" /> identify missing pieces
                      </Link>
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <ImageIcon className="mb-4 h-10 w-10 text-zinc-700" />
                <p className="text-zinc-500">your uploaded image and its style tags will show up here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
