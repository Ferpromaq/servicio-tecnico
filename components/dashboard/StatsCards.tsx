
"use client";

import { useEffect, useState } from "react";
import {
  ClipboardList,
  Search,
  ShoppingCart,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Stat = {
  id: string;
  value: number | null;
  label: string;
  sublabel: string;
  icon: "clipboard" | "search" | "cart" | "wrench";
  color: "blue" | "amber" | "purple" | "green";
};

const initialStats: Stat[] = [
  {
    id: "recepcion",
    value: null,
    label: "Recepción",
    sublabel: "Nuevas órdenes",
    icon: "clipboard",
    color: "blue",
  },
  {
    id: "diagnostico",
    value: null,
    label: "Diagnóstico",
    sublabel: "En revisión",
    icon: "search",
    color: "amber",
  },
  {
    id: "repuestos",
    value: null,
    label: "Repuestos pendientes",
    sublabel: "Por autorizar",
    icon: "cart",
    color: "purple",
  },
  {
    id: "reparacion",
    value: null,
    label: "En reparación",
    sublabel: "En proceso",
    icon: "wrench",
    color: "green",
  },
];

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
  const [stats, setStats] = useState<Stat[]>(initialStats);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      const [
        recepcionResult,
        diagnosticoResult,
        repuestosResult,
        reparacionResult,
      ] = await Promise.all([
        supabase
          .from("ordenes_servicio")
          .select("id", { count: "exact", head: true })
          .eq("estado", "recepcion"),

        supabase
          .from("ordenes_servicio")
          .select("id", { count: "exact", head: true })
          .eq("estado", "diagnostico"),

        supabase
          .from("repuestos_solicitados")
          .select("id", { count: "exact", head: true })
          .eq("estado", "pendiente"),

        supabase
          .from("ordenes_servicio")
          .select("id", { count: "exact", head: true })
          .eq("estado", "en_reparacion"),
      ]);

      if (!active) return;

      const results = [
        recepcionResult,
        diagnosticoResult,
        repuestosResult,
        reparacionResult,
      ];

      const hasError = results.some((result) => result.error);

      if (hasError) {
        console.error(
          "Error al cargar las estadísticas del dashboard:",
          results
            .filter((result) => result.error)
            .map((result) => result.error)
        );

        setError(true);
        return;
      }

      setStats([
        { ...initialStats[0], value: recepcionResult.count ?? 0 },
        { ...initialStats[1], value: diagnosticoResult.count ?? 0 },
        { ...initialStats[2], value: repuestosResult.count ?? 0 },
        { ...initialStats[3], value: reparacionResult.count ?? 0 },
      ]);
    }

    loadStats();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
        {stats.map((stat) => {
          const Icon = iconMap[stat.icon];

          return (
            <div
              key={stat.id}
              className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 shadow-sm p-2.5"
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                  colorMap[stat.color]
                }`}
              >
                <Icon size={15} strokeWidth={1.8} />
              </div>

              <div className="min-w-0">
                <p className="text-base font-bold text-gray-900 leading-tight">
                  {stat.value === null ? "—" : stat.value}
                </p>

                <p className="text-xs font-medium text-gray-700 truncate">
                  {stat.label}
                </p>

                <p className="text-[10px] text-gray-400 truncate">
                  {stat.sublabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">
          No se pudieron cargar las estadísticas. Revisa la consola y los
          permisos de Supabase.
        </p>
      )}
    </div>
  );
}
