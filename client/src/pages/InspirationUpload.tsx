import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadInspirationImage, analyzeInspirationImage } from '@/lib/api';
import { FileInput } from '@/components/ui/file-input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function InspirationUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageId, setUploadedImageId] = useState<number | null>(null);
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload image mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadInspirationImage(file),
    onSuccess: (data) => {
      setUploadedImage(data.imageUrl);
      setUploadedImageId(data.id);
      setStyleTags([]);
      toast({
        title: "Image uploaded successfully",
        description: "Now you can analyze it for style tags.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Analyze image mutation
  const analyzeMutation = useMutation({
    mutationFn: (id: number) => analyzeInspirationImage(id),
    onSuccess: (data) => {
      setStyleTags(data.styleTags);
      setIsAnalyzing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/inspiration'] });
      toast({
        title: "Analysis complete",
        description: "Style tags have been generated for your inspiration image.",
      });
    },
    onError: (error) => {
      setIsAnalyzing(false);
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setUploadedImage(null);
    setUploadedImageId(null);
    setStyleTags([]);
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    } else {
      toast({
        title: "No file selected",
        description: "Please select an image to upload.",
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = () => {
    if (uploadedImageId) {
      setIsAnalyzing(true);
      analyzeMutation.mutate(uploadedImageId);
    }
  };

  return (
    <section id="inspiration" className="py-12 border-t border-zinc-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl mb-6 gradient-text">upload fit inspiration</h2>
        <p className="text-zinc-400 mb-8">
          share photos of outfits you love to get style insights and matching recommendations from your own closet.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upload Area */}
          <div className="flex flex-col">
            <FileInput
              onFileSelected={(file) => {
                handleFileSelected(file);
                uploadMutation.mutate(file);
              }}
              className="h-80 dark-card"
              icon={<i className="fas fa-cloud-upload-alt text-3xl text-zinc-500 mb-2"></i>}
              label={uploadMutation.isPending ? "uploading..." : "drop your inspiration photo here"}
            />
            {uploadedImage && (
              <div className="mt-4">
                <Button 
                  className="w-full py-6 bg-black hover:bg-zinc-900 text-white border border-zinc-800"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || analyzeMutation.isPending}
                >
                  {isAnalyzing || analyzeMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">
                        <i className="fas fa-spinner"></i>
                      </span>
                      analyzing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-magic mr-2"></i> get style tags
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Result Area */}
          <div className="h-full dark-card overflow-hidden">
            {uploadedImage ? (
              <>
                <div className="h-52 flex justify-center items-center overflow-hidden bg-black">
                  <img 
                    src={uploadedImage} 
                    alt="uploaded inspiration" 
                    className="max-h-52 max-w-full object-contain" 
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg mb-3 text-zinc-300">ai-generated style tags</h3>
                  {styleTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {styleTags.map((tag, index) => (
                        <span key={index} className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-sm border border-zinc-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-zinc-500 italic">
                      {isAnalyzing || analyzeMutation.isPending ? 
                        "analyzing your image..." : 
                        <>
                          <p>click 'get style tags' to analyze this image</p>
                          <p className="mt-2 text-xs text-zinc-600">style tags are optional for missing pieces recommendations</p>
                        </>
                      }
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                    {uploadedImageId && (
                      <Button 
                        className="w-full py-3 bg-black hover:bg-zinc-900 text-zinc-300 border border-zinc-800 text-sm transition-colors"
                        asChild
                      >
                        <a href={`/inspiration/${uploadedImageId}/style-matching`}>
                          <i className="fas fa-tshirt mr-2"></i> find matching items in your closet
                        </a>
                      </Button>
                    )}
                    
                    {uploadedImageId && (
                      <Button 
                        className="w-full py-3 bg-gradient-to-r from-purple-900/30 to-rose-900/30 hover:from-purple-900/50 hover:to-rose-900/50 text-zinc-300 border border-zinc-800 text-sm transition-colors"
                        asChild
                      >
                        <a href={`/inspiration/${uploadedImageId}/missing-pieces`}>
                          <i className="fas fa-magic mr-2"></i> identify missing pieces
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <i className="fas fa-image text-4xl text-zinc-700 mb-4"></i>
                <p className="text-zinc-500">upload an inspiration image to see ai-generated style tags here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
