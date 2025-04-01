import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ColorPalette, useColorPalette } from "@/components/ui/color-palette";
import { createOutfitShareableImage, shareOutfitToSocial } from "@/lib/api";
import { ClothingItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Instagram,
  Camera,
  Facebook,
  Twitter,
  Share2
} from "lucide-react";

interface SocialShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outfitId: string;
  outfitName: string;
  outfitItems: ClothingItem[];
}

const SOCIAL_PLATFORMS = [
  {
    name: "Instagram",
    icon: <Instagram className="h-6 w-6" />,
    color: "bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500",
    id: "instagram"
  },
  {
    name: "Snapchat",
    icon: <Camera className="h-6 w-6" />,
    color: "bg-yellow-400 text-black",
    id: "snapchat"
  },
  {
    name: "Facebook",
    icon: <Facebook className="h-6 w-6" />,
    color: "bg-blue-600",
    id: "facebook"
  },
  {
    name: "Twitter",
    icon: <Twitter className="h-6 w-6" />,
    color: "bg-sky-500",
    id: "twitter"
  }
];

const SHARE_TEMPLATES = [
  {
    id: "modern",
    name: "Modern",
    preview: "■■■"
  },
  {
    id: "minimal",
    name: "Minimal",
    preview: "□□□"
  },
  {
    id: "bold",
    name: "Bold",
    preview: "▣▣▣"
  },
  {
    id: "bordered",
    name: "Bordered",
    preview: "▢▢▢"
  }
];

export function SocialShareModal({
  open,
  onOpenChange,
  outfitId,
  outfitName,
  outfitItems
}: SocialShareModalProps) {
  const { toast } = useToast();
  const [caption, setCaption] = useState(`ootd ✨`);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(SHARE_TEMPLATES[0].id);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [step, setStep] = useState<"customize" | "preview" | "share">("customize");
  const { colors, selectedColor, setSelectedColor } = useColorPalette();

  const handleGeneratePreview = async () => {
    try {
      setIsLoading(true);
      // Create a shareable image with the selected options
      const result = await createOutfitShareableImage(outfitId, {
        background: selectedColor,
        template: selectedTemplate,
        caption
      });

      setPreviewUrl(result.imageUrl);
      setShareUrl(result.shareUrl);
      setStep("preview");
      setIsLoading(false);
    } catch (error) {
      console.error("Error generating preview:", error);
      toast({
        title: "error",
        description: "couldn't generate share preview",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleShare = async (platform: string) => {
    try {
      setIsLoading(true);
      const result = await shareOutfitToSocial(outfitId, platform as any);

      window.open(result.shareUrl, "_blank");

      toast({
        title: "shared!",
        description: `your outfit has been shared to ${platform}`,
      });

      setIsLoading(false);
      onOpenChange(false); // Close modal after sharing
    } catch (error) {
      console.error("Error sharing:", error);
      toast({
        title: "share failed",
        description: `couldn't share to ${platform}`,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border border-zinc-800 text-zinc-300 p-0 overflow-hidden max-w-md w-full mx-auto shadow-xl">
        <DialogTitle className="p-6 text-lg font-light tracking-wide">
          {step === "customize" && (
            <span className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 flex items-center justify-center">
                <span className="text-xs">1</span>
              </div>
              customize your share
            </span>
          )}
          {step === "preview" && (
            <span className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                <span className="text-xs">2</span>
              </div>
              preview your share
            </span>
          )}
          {step === "share" && (
            <span className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                <span className="text-xs">3</span>
              </div>
              share your outfit
            </span>
          )}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Share your outfit to social media
        </DialogDescription>

        {step === "customize" && (
          <div className="space-y-6 px-6 pb-6">
            <div className="space-y-2">
              <h3 className="text-sm text-zinc-400">caption</h3>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm"
                placeholder="enter your caption..."
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm text-zinc-400">background color</h3>
              <ColorPalette
                colors={colors}
                selectedColor={selectedColor}
                onSelectColor={setSelectedColor}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm text-zinc-400">template style</h3>
              <div className="grid grid-cols-2 gap-2">
                {SHARE_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    className={`p-3 text-center rounded-md transition-all ${
                      selectedTemplate === template.id
                        ? "bg-zinc-700 ring-1 ring-white"
                        : "bg-zinc-800 hover:bg-zinc-700"
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div className="text-xl mb-1">{template.preview}</div>
                    <div className="text-xs">{template.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-0"
              onClick={handleGeneratePreview}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  generating...
                </span>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  preview share
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 6L19 12L13 18M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </Button>
          </div>
        )}

        {step === "preview" && previewUrl && (
          <div className="space-y-6 px-6 pb-6">
            <div className="aspect-square rounded-md overflow-hidden bg-black flex items-center justify-center">
              {/* Aesthetic preview of the outfit */}
              <div
                className="w-full h-full flex flex-col items-center justify-center text-center p-6"
                style={{ backgroundColor: selectedColor }}
              >
                <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg w-full max-w-xs">
                  <h3 className="text-2xl font-light mb-6 tracking-wide bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {caption}
                  </h3>
                  <div className="flex gap-4 justify-center mb-6">
                    {outfitItems.slice(0, 3).map((item, index) => (
                      <div key={index} className="w-20 h-20 overflow-hidden rounded-lg border border-white/30 shadow-lg">
                        <img
                          src={item.imageUrl}
                          alt={item.category}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm italic text-white/70 font-light">
                    styled with stylematch.org
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-zinc-700 hover:bg-zinc-800"
                onClick={() => setStep("customize")}
              >
                <span className="flex items-center gap-2 justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 17L5 12L11 7M19 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  back
                </span>
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 border-0"
                onClick={() => setStep("share")}
              >
                <span className="flex items-center gap-2 justify-center">
                  continue to share
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 6L19 12L13 18M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </Button>
            </div>
          </div>
        )}

        {step === "share" && (
          <div className="space-y-6 px-6 pb-6">
            <h3 className="text-sm text-zinc-400">share to</h3>
            <div className="grid grid-cols-2 gap-4">
              {SOCIAL_PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  className={`p-4 rounded-lg ${platform.color} flex flex-col items-center justify-center gap-2 hover:opacity-90 transition-opacity`}
                  onClick={() => handleShare(platform.id)}
                  disabled={isLoading}
                >
                  {platform.icon}
                  <span className="text-sm">{platform.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 relative">
              <Button
                variant="outline"
                className="w-full border-zinc-700 hover:bg-zinc-800 flex items-center gap-2 bg-gradient-to-br from-zinc-800 to-zinc-900"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl || window.location.href);
                  toast({
                    title: "link copied",
                    description: "share link copied to clipboard"
                  });
                }}
              >
                <Share2 className="h-4 w-4" />
                copy share link
              </Button>
              <Button
                variant="outline"
                className="absolute right-0 top-0 h-full border-zinc-700 hover:bg-zinc-800 px-3"
                onClick={() => setStep("preview")}
              >
                <span className="flex items-center gap-2 justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 17L5 12L11 7M19 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  back
                </span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}