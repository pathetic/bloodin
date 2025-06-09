import { IconMusic, IconDisc } from "@tabler/icons-react";

interface ImagePlaceholderProps {
  type?: "song" | "album";
  size?: "small" | "medium" | "large";
  className?: string;
}

export default function ImagePlaceholder({
  type = "album",
  size = "medium",
  className = "",
}: ImagePlaceholderProps) {
  const sizeClasses = {
    small: "w-10 h-10",
    medium: "w-16 h-16",
    large: "w-full h-full",
  };

  const iconSizes = {
    small: 16,
    medium: 24,
    large: 32,
  };

  const Icon = type === "song" ? IconMusic : IconDisc;

  return (
    <div
      className={`
      ${sizeClasses[size]}
      bg-gradient-to-br from-red-600 via-red-700 to-red-800
      rounded-lg
      flex items-center justify-center
      border border-red-500/30
      shadow-lg
      ${className}
    `}
    >
      <Icon size={iconSizes[size]} className="text-white/80" />
    </div>
  );
}
