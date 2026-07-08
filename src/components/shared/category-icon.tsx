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
    "🎯": "Target",
    "💰": "PiggyBank",
    "🏍️": "Bike",
    "💍": "Gem",
    "🏖️": "Palmtree",
  };

  const resolvedName = emojiMap[name] || name;
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[resolvedName];

  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // Fallback to a default Folder icon
  const Fallback = Icons.Folder;
  return <Fallback className={className} />;
}
