import * as Icons from "lucide-react";

interface CategoryIconProps {
  name: string;
  className?: string;
}

export function CategoryIcon({ name, className = "w-4 h-4" }: CategoryIconProps) {
  // Map emoji characters to corresponding Lucide React icon names for backward compatibility
  const emojiMap: Record<string, string> = {
    "🍔": "Utensils",
    "🍽️": "Utensils",
    "🚗": "Car",
    "✈️": "Plane",
    "🏠": "Home",
    "🛍️": "ShoppingBag",
    "⚡": "Zap",
    "📄": "Receipt",
    "🏥": "HeartPulse",
    "💊": "HeartPulse",
    "🎓": "GraduationCap",
    "📚": "GraduationCap",
    "📁": "FolderOpen",
    "📌": "Folder",
    "🎮": "Gamepad2",
    "🎬": "Film",
    "🍷": "GlassWater",
    "🏋️": "Dumbbell",
    "🐱": "Cat",
    "🎨": "Palette",
    "🧱": "Grid",
    "💻": "Laptop",
    "🎵": "Music",
    "🎁": "Gift",
    "☕": "Coffee",
    "🤝": "HandCoins",
    "💰": "Coins",
  };

  const resolvedName = emojiMap[name] || name;
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[resolvedName];

  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // If it's an emoji but not in our map, try to render it as text
  // Check if name is likely an emoji (basic check)
  if (name.length <= 2) {
    return <span className={className}>{name}</span>;
  }

  // Fallback to a default Folder icon
  const Fallback = Icons.Folder;
  return <Fallback className={className} />;
}
