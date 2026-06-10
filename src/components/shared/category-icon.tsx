import * as Icons from "lucide-react";

interface CategoryIconProps {
  name: string;
  className?: string;
}

export function CategoryIcon({ name, className = "w-4 h-4" }: CategoryIconProps) {
  // Regex to detect if the string contains an emoji
  const isEmoji = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/.test(name);

  if (isEmoji) {
    return <span className={className}>{name}</span>;
  }

  // If not an emoji, try to resolve as a Lucide icon name
  // Map some old emoji strings to icons just in case they are still used as keys
  const emojiToIconMap: Record<string, string> = {
    "hamburger": "Utensils",
    "car": "Car",
    "house": "Home",
  };

  const resolvedName = emojiToIconMap[name] || name;
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[resolvedName];

  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // Fallback to a default Folder icon
  const Fallback = Icons.Folder;
  return <Fallback className={className} />;
}
