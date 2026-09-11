"use client";

import { Maquina } from "../types";
import { MaquinaTableRow } from "./MaquinaTableRow";

interface MaquinasTableProps {
  maquinas: Maquina[];
}

const COLUMNS = [
  { label: "Código", className: "text-left w-[8%]" },
  { label: "Máquina", className: "text-left w-[13%]" },
  { label: "Marca / Modelo", className: "text-left w-[13%]" },
  { label: "Propietario", className: "text-left w-[13%]" },
  { label: "Estado", className: "text-center w-[13%]" },
  { label: "Horas", className: "text-center w-[7%]" },
  { label: "Diagnóstico", className: "text-left w-[21%]" },
  { label: "Acciones", className: "text-center w-[12%]" },
];

export function MaquinasTable({ maquinas }: MaquinasTableProps) {
  if (maquinas.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-12 text-center text-sm text-gray-500">
        No se encontraron máquinas.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
      <table className="w-full table-fixed">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className={`px-3 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap ${col.className}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {maquinas.map((m) => (
            <MaquinaTableRow key={m.id} maquina={m} />
          ))}
        </tbody>
      </table>
    </div>
  );
}