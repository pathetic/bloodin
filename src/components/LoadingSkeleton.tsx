import React from "react";

interface SkeletonCardProps {
  type?: "card" | "row" | "table";
  count?: number;
}

export function SkeletonCard() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="aspect-square bg-gray-600 rounded-lg"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-600 rounded"></div>
        <div className="h-3 bg-gray-700 rounded w-3/4"></div>
      </div>
    </div>
  );
}

export function SkeletonRow({ index }: { index: number }) {
  return (
    <div
      className="grid grid-cols-12 gap-4 p-4 animate-pulse border-b border-white/5 min-w-full"
      style={{ height: 72 }}
    >
      <div className="col-span-1 flex items-center">
        <div className="w-4 h-4 bg-gray-600 rounded"></div>
      </div>
      <div className="col-span-5 flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-600 rounded"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-600 rounded w-32"></div>
          <div className="h-3 bg-gray-700 rounded w-24"></div>
        </div>
      </div>
      <div className="col-span-3 flex items-center">
        <div className="h-3 bg-gray-700 rounded w-20"></div>
      </div>
      <div className="col-span-2 flex items-center">
        <div className="h-3 bg-gray-700 rounded w-24"></div>
      </div>
      <div className="col-span-1 flex items-center justify-end">
        <div className="h-3 bg-gray-700 rounded w-12"></div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 12, type = "card" }: SkeletonCardProps) {
  if (type === "table") {
    return (
      <div className="space-y-0">
        {[...Array(count)].map((_, i) => (
          <SkeletonRow key={`skeleton-row-${i}`} index={i + 1} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={`skeleton-card-${i}`} />
      ))}
    </div>
  );
}

export default {
  Card: SkeletonCard,
  Row: SkeletonRow,
  Grid: SkeletonGrid,
};
