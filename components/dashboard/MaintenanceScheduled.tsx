
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type MaquinaRelacion = {
  nombre: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
};

type Mantenimiento = {
  id: string;
  descripcion: string;
  proxima_revision: string;
  maquina: MaquinaRelacion | MaquinaRelacion[] | null;
};

function getFechaLocal() {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return `${año}-${mes}-${dia}`;
}

function formatearFecha(fecha: string) {
  const [año, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${año}`;
}

export default function MaintenanceScheduled() {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function cargarMantenimientos() {
      setLoading(true);
      setError(false);

      const { data, error } = await supabase
        .from("mantenimientos")
        .select(`
          id,
          descripcion,
          proxima_revision,
          maquina:maquinas!mantenimientos_maquina_id_fkey (
            nombre,
            marca,
            modelo,
            numero_serie
          )
        `)
        .gte("proxima_revision", getFechaLocal())
        .order("proxima_revision", { ascending: true })
        .limit(10);

      if (!active) return;

      if (error) {
        console.error("Error al cargar mantenimientos programados:", error);
        setError(true);
        setLoading(false);
        return;
      }

      setMantenimientos((data ?? []) as Mantenimiento[]);
      setLoading(false);
    }

    cargarMantenimientos();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-bold text-gray-900">
          Mantenimientos Programados
        </h3>

        <Link
          href="/calendario"
          className="text-[13px] font-medium text-blue-600 hover:underline shrink-0"
        >
          Ver calendario
        </Link>
      </div>

      {loading ? (
        <p className="py-4 text-sm text-gray-400">
          Cargando mantenimientos...
        </p>
      ) : error ? (
        <p className="py-4 text-sm text-red-600">
          No se pudieron cargar los mantenimientos.
        </p>
      ) : mantenimientos.length === 0 ? (
        <p className="py-4 text-sm text-gray-400">
          No hay mantenimientos programados para hoy o fechas posteriores.
        </p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {mantenimientos.map((item) => {
            const maquina = Array.isArray(item.maquina)
              ? item.maquina[0]
              : item.maquina;

            const nombreMaquina =
              maquina?.nombre || "Máquina sin nombre";

            const detalleMaquina = [
              maquina?.marca,
              maquina?.modelo,
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <li
                key={item.id}
                className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 shrink-0">
                  <Calendar size={14} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-400">
                    {formatearFecha(item.proxima_revision)}
                  </p>

                  <p className="text-[13px] font-medium text-gray-800 truncate">
                    {nombreMaquina}
                  </p>

                  <p className="text-[11px] text-gray-400 truncate">
                    {detalleMaquina || maquina?.numero_serie || "Sin modelo"}
                  </p>

                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                    {item.descripcion}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700">
                    Programado
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
