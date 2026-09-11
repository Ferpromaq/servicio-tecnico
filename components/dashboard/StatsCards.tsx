"use client";

import { ClipboardList, Search, ShoppingCart, Wrench } from "lucide-react";
import { stats } from "@/lib/mockData";

const iconMap = {
  clipboard: ClipboardList,
  search: Search,
  cart: ShoppingCart,
  wrench: Wrench,
};

const colorMap = {
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  purple: "bg-purple-50 text-purple-600",
  green: "bg-green-50 text-green-600",
};

export default function StatsCards() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
      {stats.map((stat) => {
        const Icon = iconMap[stat.icon as keyof typeof iconMap];
        return (
          <div
            key={stat.id}
            className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 shadow-sm p-2.5"
          >
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                colorMap[stat.color as keyof typeof colorMap]
              }`}
            >
              <Icon size={15} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-gray-900 leading-tight">
                {stat.value}
              </p>
              <p className="text-xs font-medium text-gray-700 truncate">
                {stat.label}
              </p>
              <p className="text-[10px] text-gray-400 truncate">{stat.sublabel}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
