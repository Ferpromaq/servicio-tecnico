"use client";

import { Search, Filter } from "lucide-react";

interface MaquinasSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onFiltersClick?: () => void;
}

export function MaquinasSearchBar({
  searchTerm,
  onSearchChange,
  onFiltersClick,
}: MaquinasSearchBarProps) {
  return (
    <div className="flex gap-3 mb-5">
      <div className="flex-1 relative">
        <Search className="absolute left-3.5 top-2.5 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Buscar por nombre, marca o cliente..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-[#ff3300]"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <button
        onClick={onFiltersClick}
        className="flex items-center gap-2 px-5 text-sm border border-gray-200 rounded-2xl hover:bg-gray-50"
      >
        <Filter className="w-4 h-4" />
        Filtros
      </button>
    </div>
  );
}