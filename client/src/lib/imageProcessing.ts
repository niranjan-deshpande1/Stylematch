/**
 * Cuts the clothing item out of its photo and puts it on a plain white
 * background, so closet thumbnails look consistent. Runs entirely in the
 * browser. If it fails for any reason, the original photo is used.
 */
export async function removeBackground(file: File): Promise<File> {
  try {
    // Loaded on first use: the model runtime is large and only this page needs it.
    const { removeBackground: removeImageBackground } = await import("@imgly/background-removal");
    const cutout = await removeImageBackground(file);
    const bitmap = await createImageBitmap(cutout);

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".png";
    return new File([blob], name, { type: "image/png" });
  } catch (error) {
    console.warn("Background removal failed, using the original photo", error);
    return file;
  }
}
