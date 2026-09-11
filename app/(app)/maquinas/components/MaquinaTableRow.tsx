"use client";

import Link from "next/link";
import { Maquina } from "../types";
import { EstadoBadge } from "./EstadoBadge";

interface MaquinaTableRowProps {
  maquina: Maquina;
}

export function MaquinaTableRow({ maquina: m }: MaquinaTableRowProps) {
  return (
    <tr className="hover:bg-gray-50 transition">
      <td className="py-3.5 px-5 font-mono text-xs text-gray-500">
        {m.codigo_interno || "—"}
      </td>
      <td className="py-3.5 px-5 text-sm font-medium">{m.nombre}</td>
      <td className="py-3.5 px-5 text-sm text-gray-700">
        {m.marca} {m.modelo && `• ${m.modelo}`}
      </td>
      <td className="py-3.5 px-5 text-sm">
        <span className={m.es_propia ? "text-emerald-600 font-medium" : ""}>
          {m.cliente_nombre}
        </span>
      </td>
      <td className="py-3.5 px-5 text-center">
        <EstadoBadge estado={m.estado} />
      </td>
      <td className="py-3.5 px-5 text-sm text-gray-600">{m.horas_uso} hrs</td>
      <td className="py-3.5 px-5 text-sm text-gray-500 max-w-md truncate">
        {m.diagnostico || "Sin diagnóstico registrado"}
      </td>
      <td className="px-5 py-3.5 text-center">
        <Link
          href={`/reportes/${m.id}`}
          className="inline-flex items-center rounded-xl bg-[#ff3300] px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-[#e62e00]"
        >
          Ver ficha
        </Link>
      </td>
    </tr>
  );
}