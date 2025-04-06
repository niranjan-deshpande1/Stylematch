import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

interface FileInputProps {
  onFileSelected: (file: File) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
  icon?: React.ReactNode;
  label?: string;
  sublabel?: string;
  buttonText?: string;
}

export function FileInput({
  onFileSelected,
  accept = 'image/*',
  multiple = false,
  className,
  icon = <i className="fas fa-cloud-upload-alt text-3xl text-gray-500 mb-2"></i>,
  label = 'Drop your photo here',
  sublabel = 'or click to browse',
  buttonText = 'Select Image'
}: FileInputProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      if (multiple) {
        acceptedFiles.forEach(file => onFileSelected(file));
      } else {
        onFileSelected(acceptedFiles[0]);
      }
    }
  }, [multiple, onFileSelected]);

  const { getRootProps, getInputProps, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: { [accept]: [] },
    multiple,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    onDropRejected: () => setIsDragActive(false),
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'cursor-pointer flex flex-col items-center justify-center border border-zinc-800 transition-colors bg-zinc-900/50 p-8',
        {
          'border-zinc-300 bg-zinc-900': isDragActive || isDragAccept,
          'border-red-500 bg-red-900/10': isDragReject,
        },
        className
      )}
    >
      <input {...getInputProps()} />
      {icon}
      <p className="text-zinc-300 font-light">{label}</p>
      <p className="text-zinc-500 text-sm mt-1">{sublabel}</p>
      <button
        type="button"
        className="mt-6 px-6 py-2 bg-black text-zinc-300 border border-zinc-800 text-sm hover:bg-zinc-900 hover:border-zinc-700 transition-colors"
      >
        {buttonText}
      </button>
    </div>
  );
}
