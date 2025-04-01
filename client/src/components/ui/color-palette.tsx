import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface ColorPaletteProps {
  colors: string[];
  onSelectColor: (color: string) => void;
  selectedColor?: string;
  className?: string;
}

export function ColorPalette({
  colors,
  onSelectColor,
  selectedColor,
  className,
}: ColorPaletteProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {colors.map((color) => (
        <ColorSwatch
          key={color}
          color={color}
          isSelected={color === selectedColor}
          onClick={() => onSelectColor(color)}
        />
      ))}
    </div>
  );
}

interface ColorSwatchProps {
  color: string;
  isSelected?: boolean;
  onClick: () => void;
}

function ColorSwatch({ color, isSelected, onClick }: ColorSwatchProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
        isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : "",
        isHovered && !isSelected ? "scale-110" : ""
      )}
      style={{ backgroundColor: color }}
      aria-label={`Select ${color} color`}
    >
      {isSelected && (
        <span className="text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </button>
  );
}

export function useColorPalette(initialColors: string[] = []) {
  const [colors] = useState<string[]>(
    initialColors.length > 0
      ? initialColors
      : [
          "#000000", // Black
          "#FFFFFF", // White
          "#FF0000", // Red
          "#00FF00", // Green
          "#0000FF", // Blue
          "#FFFF00", // Yellow
          "#FF00FF", // Magenta
          "#00FFFF", // Cyan
          "#FFA500", // Orange
          "#800080", // Purple
          "#008080", // Teal
          "#A52A2A", // Brown
          "#808080", // Gray
          "#F5F5DC", // Beige
          "#FFC0CB", // Pink
          "#ADD8E6", // Light Blue
          "#90EE90", // Light Green
          "#E6E6FA", // Lavender
        ]
  );

  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    colors[0]
  );

  return {
    colors,
    selectedColor,
    setSelectedColor,
  };
}