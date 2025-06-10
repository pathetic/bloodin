import React from "react";

interface QuickAccessCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  onClick?: () => void;
}

export default function QuickAccessCard({
  icon,
  title,
  subtitle,
  color,
  onClick,
}: QuickAccessCardProps) {
  return (
    <div
      className={`relative bg-gradient-to-br ${color} bg-opacity-30 backdrop-blur-md rounded-xl p-4 cursor-pointer hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl group overflow-hidden`}
      onClick={onClick}
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5 rounded-xl"></div>

      {/* Border highlight */}
      <div className="absolute inset-0 rounded-xl border border-white/20 group-hover:border-white/30 transition-colors duration-300"></div>

      {/* Content */}
      <div className="relative flex items-center space-x-3 z-10">
        <div className="text-white drop-shadow-lg">{icon}</div>
        <div>
          <h3 className="font-semibold text-white drop-shadow-md">{title}</h3>
          <p className="text-white/90 text-sm drop-shadow-sm">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
