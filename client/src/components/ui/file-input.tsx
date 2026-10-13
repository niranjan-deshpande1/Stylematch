import { useCallback, type ReactNode } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileInputProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
  label?: string;
  sublabel?: string;
  buttonText?: string;
}

/** Drag-and-drop (or click-to-browse) image picker. */
export function FileInput({
  onFilesSelected,
  multiple = false,
  disabled = false,
  className,
  icon = <UploadCloud className="mb-2 h-8 w-8 text-zinc-500" />,
  label = "drop your photo here",
  sublabel = "or click to browse",
  buttonText = "select image",
}: FileInputProps) {
  const onDrop = useCallback(
    (files: File[]) => {
      if (files.length > 0) onFilesSelected(files);
    },
    [onFilesSelected],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    multiple,
    disabled,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center border border-zinc-800 bg-zinc-900/50 p-8 transition-colors",
        isDragActive && "border-zinc-300 bg-zinc-900",
        isDragReject && "border-red-500 bg-red-900/10",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input {...getInputProps()} />
      {icon}
      <p className="font-light text-zinc-300">{label}</p>
      <p className="mt-1 text-sm text-zinc-500">{sublabel}</p>
      <span className="mt-6 border border-zinc-800 bg-black px-6 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
        {buttonText}
      </span>
    </div>
  );
}
