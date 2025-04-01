import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';

/**
 * Removes the background from an image using ImglyBackgroundRemoval
 * @param file The input image file
 * @returns Promise resolving to a new File object with background removed
 */
export async function removeBackground(file: File): Promise<File> {
  try {
    // Show loading indicator or something here

    // Process the image with background removal
    const blob = await imglyRemoveBackground(file);

    // Create a new file from the blob
    // Create a canvas to set white background
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    await new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        // Fill white background
        ctx!.fillStyle = '#FFFFFF';
        ctx!.fillRect(0, 0, canvas.width, canvas.height);
        // Draw the image
        ctx!.drawImage(img, 0, 0);
        resolve(null);
      };
      img.src = URL.createObjectURL(blob);
    });

    // Convert canvas to blob
    const whiteBackgroundBlob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png')
    );

    const processedFile = new File([whiteBackgroundBlob], file.name, {
      type: 'image/png',
      lastModified: Date.now()
    });

    return processedFile;
  } catch (error) {
    console.error('Background removal failed:', error);
    // Return original file if processing fails
    return file;
  }
}