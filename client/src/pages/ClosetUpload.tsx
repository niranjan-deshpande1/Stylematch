import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadClothingItem, analyzeClothingItem, deleteClothingItem } from '@/lib/api';
import { removeBackground } from '@/lib/imageProcessing';
import { FileInput } from '@/components/ui/file-input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { clothingCategories, ClothingItem } from '@shared/schema';

interface UploadPreview {
  id: number | null;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'uploaded' | 'analyzing' | 'analyzed' | 'error';
  tags: string[];
  category: string;
}

export default function ClosetUpload() {
  const [previews, setPreviews] = useState<UploadPreview[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('tops');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload clothing item mutation
  const uploadMutation = useMutation({
    mutationFn: ({ file, category }: { file: File; category: string }) => 
      uploadClothingItem(file, category),
    onSuccess: (data, variables) => {
      // Update preview with uploaded item info
      setPreviews(prev => prev.map(preview => 
        preview.file === variables.file 
          ? { 
              ...preview, 
              id: data.id, 
              status: 'uploaded',
              previewUrl: data.imageUrl 
            } 
          : preview
      ));
      
      // After upload, automatically analyze
      analyzeMutation.mutate({
        id: data.id,
        previewIndex: previews.findIndex(p => p.file === variables.file)
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/closet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
    },
    onError: (error, variables) => {
      // Mark preview as error
      setPreviews(prev => prev.map(preview => 
        preview.file === variables.file 
          ? { ...preview, status: 'error' } 
          : preview
      ));
      
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Analyze clothing item mutation
  const analyzeMutation = useMutation({
    mutationFn: ({ id, previewIndex }: { id: number; previewIndex: number }) => {
      // Update status to analyzing
      setPreviews(prev => prev.map((preview, idx) => 
        idx === previewIndex
          ? { ...preview, status: 'analyzing' }
          : preview
      ));
      
      return analyzeClothingItem(id);
    },
    onSuccess: (data, variables) => {
      // Update preview with tags
      setPreviews(prev => prev.map((preview, idx) => 
        idx === variables.previewIndex
          ? { 
              ...preview, 
              status: 'analyzed',
              tags: data.styleTags
            } 
          : preview
      ));
      
      queryClient.invalidateQueries({ queryKey: ['/api/closet'] });
    },
    onError: (error, variables) => {
      // Mark preview as error
      setPreviews(prev => prev.map((preview, idx) => 
        idx === variables.previewIndex
          ? { ...preview, status: 'error' } 
          : preview
      ));
      
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete clothing item mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteClothingItem(id),
    onSuccess: (_, id) => {
      // Remove preview
      setPreviews(prev => prev.filter(preview => preview.id !== id));
      
      queryClient.invalidateQueries({ queryKey: ['/api/closet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      
      toast({
        title: "Item deleted",
        description: "The clothing item has been removed from your closet.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelected = async (file: File) => {
    // Create object URL for preview
    const previewUrl = URL.createObjectURL(file);
    
    // Add to previews with uploading status
    const newPreviewIndex = previews.length;
    setPreviews(prev => [...prev, {
      id: null,
      file,
      previewUrl,
      status: 'uploading',
      tags: [],
      category: selectedCategory
    }]);
    
    try {
      // Process the image to remove background
      const processedFile = await removeBackground(file);
      
      // Update preview with processed file
      setPreviews(prev => {
        const updatedPreviews = [...prev];
        if (updatedPreviews[newPreviewIndex]) {
          updatedPreviews[newPreviewIndex].file = processedFile;
        }
        return updatedPreviews;
      });
      
      // Start upload with processed file
      uploadMutation.mutate({ file: processedFile, category: selectedCategory });
    } catch (error) {
      console.error("Background removal failed:", error);
      
      // If background removal fails, proceed with original file
      uploadMutation.mutate({ file, category: selectedCategory });
    }
  };

  const handleDeleteItem = (preview: UploadPreview) => {
    if (preview.id) {
      deleteMutation.mutate(preview.id);
    } else {
      // For items that haven't been uploaded yet
      setPreviews(prev => prev.filter(p => p.file !== preview.file));
      
      // Revoke object URL to avoid memory leaks
      URL.revokeObjectURL(preview.previewUrl);
    }
  };

  return (
    <section id="closet" className="py-12 border-t border-zinc-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl mb-6 gradient-text">add to your closet</h2>
        <p className="text-zinc-400 mb-8">
          upload photos of your clothing items to organize your wardrobe and get outfit recommendations.
          <span className="ml-2 text-zinc-300 font-medium">background removal is automatically applied!</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upload Area */}
          <div className="flex flex-col">
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                select category
              </label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-full bg-zinc-900 border-zinc-700 text-zinc-300">
                  <SelectValue placeholder="select a category" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                  {clothingCategories.map((category) => (
                    <SelectItem key={category} value={category} className="hover:bg-zinc-800">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <FileInput
              onFileSelected={handleFileSelected}
              className="h-80 dark-card"
              icon={<i className="fas fa-tshirt text-3xl text-zinc-500 mb-2"></i>}
              label="drop your clothing item photos here"
              sublabel="background will be automatically removed"
              buttonText="select images"
            />
          </div>

          {/* Result Area */}
          <div className="min-h-[400px] dark-card overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-lg text-zinc-300">recently added items</h3>
              <p className="text-sm text-zinc-500">items are analyzed for style tags automatically</p>
            </div>
            
            {previews.length > 0 ? (
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-md overflow-hidden border border-zinc-800 bg-black">
                        <img 
                          src={preview.previewUrl} 
                          alt="clothing item" 
                          className="h-full w-full object-cover" 
                        />
                        {(preview.status === 'uploading' || preview.status === 'analyzing') && (
                          <div className="h-full w-full bg-black/70 absolute flex flex-col items-center justify-center text-white top-0 left-0">
                            <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="mt-2 text-sm">
                              {preview.status === 'uploading' ? 'uploading...' : 'analyzing...'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button 
                          className="p-2 bg-zinc-900 rounded-full text-zinc-300 border border-zinc-700"
                          onClick={() => handleDeleteItem(preview)}
                          disabled={deleteMutation.isPending}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {preview.tags.slice(0, 3).map((tag, tagIndex) => (
                            <span key={tagIndex} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-xs rounded-full border border-zinc-700">{tag}</span>
                          ))}
                          {preview.status === 'error' && (
                            <span className="px-2 py-0.5 bg-red-900 text-red-200 text-xs rounded-full border border-red-800">error</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-4 border-t border-zinc-800">
                  <Button 
                    className="w-full py-6 bg-black hover:bg-zinc-900 text-white border border-zinc-800"
                    asChild
                  >
                    <a href="/closet">view your full closet</a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <i className="fas fa-tshirt text-4xl text-zinc-700 mb-4"></i>
                <p className="text-zinc-500">upload clothing items to see them here</p>
                <p className="text-sm text-zinc-600 mt-2">ai will analyze them and generate style tags</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
