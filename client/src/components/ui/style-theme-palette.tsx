import React, { useState } from "react";
import { cn } from "@/lib/utils";

export type StyleTheme = {
  id: string;
  name: string;
  description: string;
  // Optional gradient colors for visual representation
  gradient?: string;
  // Plain background color if no gradient
  color?: string;
};

interface StyleThemePaletteProps {
  themes: StyleTheme[];
  onSelectTheme: (themeId: string) => void;
  selectedThemeId?: string;
  className?: string;
}

export function StyleThemePalette({
  themes,
  onSelectTheme,
  selectedThemeId,
  className,
}: StyleThemePaletteProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {themes.map((theme) => (
        <ThemeSwatch
          key={theme.id}
          theme={theme}
          isSelected={theme.id === selectedThemeId}
          onClick={() => onSelectTheme(theme.id)}
        />
      ))}
    </div>
  );
}

interface ThemeSwatchProps {
  theme: StyleTheme;
  isSelected?: boolean;
  onClick: () => void;
}

function ThemeSwatch({ theme, isSelected, onClick }: ThemeSwatchProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  let backgroundStyle = {};
  
  if (theme.gradient) {
    backgroundStyle = { background: theme.gradient };
  } else if (theme.color) {
    backgroundStyle = { backgroundColor: theme.color };
  } else {
    // Default background if none specified
    backgroundStyle = { backgroundColor: "#333" };
  }
  
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "w-full h-20 rounded-lg flex flex-col items-center justify-center transition-all duration-200 p-2",
        "text-center text-white shadow",
        isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-105" : "",
        isHovered && !isSelected ? "scale-105" : ""
      )}
      style={backgroundStyle}
      aria-label={`Select ${theme.name} theme`}
    >
      <span className="font-medium drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{theme.name}</span>
      <span className="text-xs opacity-90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">{theme.description}</span>
      {isSelected && (
        <div className="absolute top-2 right-2 bg-white bg-opacity-20 rounded-full w-5 h-5 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </button>
  );
}

export function useStyleThemes() {
  const [themes] = useState<StyleTheme[]>([
    {
      id: "neutral",
      name: "neutral",
      description: "timeless elegance",
      gradient: "linear-gradient(135deg, #424242 0%, #212121 100%)"
    },
    {
      id: "monochrome",
      name: "monochrome",
      description: "black & white only",
      gradient: "linear-gradient(135deg, #000000 0%, #ffffff 100%)"
    },
    {
      id: "pastel",
      name: "pastel",
      description: "soft & gentle",
      gradient: "linear-gradient(135deg, #F8BBD0 0%, #D1C4E9 50%, #BBDEFB 100%)"
    },
    {
      id: "vibrant",
      name: "vibrant",
      description: "bold & colorful",
      gradient: "linear-gradient(135deg, #FF5252 0%, #FFEB3B 50%, #00E5FF 100%)"
    },
    {
      id: "earthy",
      name: "earthy",
      description: "natural tones",
      gradient: "linear-gradient(135deg, #8D6E63 0%, #A5D6A7 100%)"
    },
    {
      id: "cool",
      name: "cool tones",
      description: "blues & greens",
      gradient: "linear-gradient(135deg, #0D47A1 0%, #00BFA5 100%)"
    },
    {
      id: "warm",
      name: "warm tones",
      description: "reds & yellows",
      gradient: "linear-gradient(135deg, #BF360C 0%, #FFB300 100%)"
    },
    {
      id: "dark",
      name: "dark palette",
      description: "deep & rich",
      gradient: "linear-gradient(135deg, #263238 0%, #455A64 100%)"
    }
  ]);

  const [selectedThemeId, setSelectedThemeId] = useState<string | undefined>(undefined);

  return {
    themes,
    selectedThemeId,
    setSelectedThemeId,
  };
}