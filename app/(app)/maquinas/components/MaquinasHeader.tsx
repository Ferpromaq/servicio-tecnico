"use client";

import { Plus } from "lucide-react";

interface MaquinasHeaderProps {
  total: number;
  onNuevaMaquina?: () => void;
}

export function MaquinasHeader({ total, onNuevaMaquina }: MaquinasHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Máquinas y Herramientas
        </h1>
        <p className="text-sm text-gray-600">
          Inventario completo • {total} registros
        </p>
      </div>
      <button
        onClick={onNuevaMaquina}
        className="flex items-center gap-2 bg-[#ff3300] hover:bg-[#e62e00] text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
      >
        <Plus className="w-4 h-4" />
        Nueva Máquina
      </button>
    </div>
  );
}