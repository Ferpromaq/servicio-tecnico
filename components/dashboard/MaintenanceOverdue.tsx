"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { maintenanceOverdue } from "@/lib/mockData";

export default function MaintenanceOverdue() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-bold text-red-600">
          Mantenimientos Vencidos
        </h3>
        <Link
          href="/mantenimientos?filtro=vencidos"
          className="text-[13px] font-medium text-blue-600 hover:underline shrink-0"
        >
          Ver todos
        </Link>
      </div>

      <ul className="divide-y divide-gray-50">
        {maintenanceOverdue.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 shrink-0">
              <AlertTriangle size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-400">{item.fecha}</p>
              <p className="text-[13px] font-medium text-gray-800 truncate">
                {item.maquina}
              </p>
              <p className="text-[11px] text-gray-400">{item.modelo}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-red-50 text-red-600">
                Vencido
              </span>
              <p className="text-[11px] text-gray-400">{item.diasVencido}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}