import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  ChevronRight,
  Search,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Estado = "Operativa" | "En Mantención" | "Fuera de Servicio";

interface Maquina {
  id: string;
  nombre: string;
  detalle: string;
  marca: string;
  serie: string;
  cliente: string;
  tipo: string;
  estado: Estado;
  ultimaMant: string;
}

const MAQUINAS_ENDPOINT = "/api/maquinas";

async function fetchMaquinas(): Promise<Maquina[]> {
  const res = await fetch(MAQUINAS_ENDPOINT);
  if (!res.ok) {
    throw new Error(`Error ${res.status} al obtener máquinas`);
  }
  return res.json();
}

const TABS: { key: "todos" | Estado; label: string }[] = [
  { key: "todos", label: "Todas" },
  { key: "Operativa", label: "Operativas" },
  { key: "En Mantención", label: "En Mantención" },
  { key: "Fuera de Servicio", label: "Fuera de Servicio" },
];

const ESTADO_STYLES: Record<Estado, { bg: string; fg: string }> = {
  Operativa: { bg: "#EAF8EE", fg: "#1E8A4C" },
  "En Mantención": { bg: "#FFF1E8", fg: "#D9591C" },
  "Fuera de Servicio": { bg: "#FDECEC", fg: "#C53434" },
};

const ESTADO_ICON: Record<Estado, React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>> = {
  Operativa: CheckCircle2,
  "En Mantención": Wrench,
  "Fuera de Servicio": AlertTriangle,
};

function EstadoBadge({ estado }: { estado: Estado }) {
  const s = ESTADO_STYLES[estado];
  const Icon = ESTADO_ICON[estado];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {estado}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Módulo de Máquinas — solo contenido (sin sidebar / header)
// ---------------------------------------------------------------------------
export default function Maquinas() {
  const [tab, setTab] = useState<"todos" | Estado>("todos");
  const [query, setQuery] = useState("");
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchMaquinas()
      .then((data) => setMaquinas(data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "No se pudo cargar la información.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return maquinas.filter((m) => {
      const matchesTab = tab === "todos" || m.estado === tab;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        q === "" ||
        m.nombre?.toLowerCase().includes(q) ||
        m.cliente?.toLowerCase().includes(q) ||
        m.serie?.toLowerCase().includes(q) ||
        m.id?.toLowerCase().includes(q);
      return matchesTab && matchesQuery;
    });
  }, [maquinas, tab, query]);

  const counts = useMemo(() => {
    const c: Record<"todos" | Estado, number> = {
      todos: maquinas.length,
      Operativa: 0,
      "En Mantención": 0,
      "Fuera de Servicio": 0,
    };
    for (const t of TABS.slice(1)) {
      c[t.key as Estado] = maquinas.filter((m) => m.estado === t.key).length;
    }
    return c;
  }, [maquinas]);

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900">Máquinas</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Inventario de máquinas registradas y su estado operativo actual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13.5px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-[#EA6A20] px-4 py-2.5 text-[13.5px] font-medium text-white shadow-sm hover:bg-[#D9591C] transition-colors">
            <Plus size={16} strokeWidth={2.5} />
            Nueva Máquina
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {(
          [
            { label: "Operativas", value: counts.Operativa, estado: "Operativa" },
            { label: "En mantención", value: counts["En Mantención"], estado: "En Mantención" },
            { label: "Fuera de servicio", value: counts["Fuera de Servicio"], estado: "Fuera de Servicio" },
          ] as { label: string; value: number; estado: Estado }[]
        ).map((card) => {
          const s = ESTADO_STYLES[card.estado];
          const Icon = ESTADO_ICON[card.estado];
          return (
            <div
              key={card.label}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5"
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: s.bg }}
              >
                <Icon size={16} style={{ color: s.fg }} strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-[19px] font-semibold leading-none text-slate-900">
                  {card.value}
                </div>
                <div className="mt-1 text-[12px] text-slate-500">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card container */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {/* Tabs row */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-1">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={
                    "relative px-3.5 py-3.5 text-[13.5px] font-medium transition-colors " +
                    (active ? "text-[#EA6A20]" : "text-slate-500 hover:text-slate-700")
                  }
                >
                  {t.label}
                  <span className="ml-1.5 text-[11.5px] text-slate-400">{counts[t.key]}</span>
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#EA6A20]" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="relative py-2.5">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar máquina, cliente, N° serie..."
              className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#EA6A20]/50 focus:bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-semibold tracking-wider text-slate-400">
                <th className="px-6 py-3">MÁQUINA</th>
                <th className="px-3 py-3">MARCA</th>
                <th className="px-3 py-3">N° SERIE</th>
                <th className="px-3 py-3">CLIENTE</th>
                <th className="px-3 py-3">TIPO</th>
                <th className="px-3 py-3">ÚLTIMA MANTENCIÓN</th>
                <th className="px-3 py-3">ESTADO</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Loader2 size={20} className="animate-spin" />
                      <span className="text-[13px]">Cargando máquinas...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle size={18} className="text-[#C53434]" />
                      <span className="text-[13px] text-[#C53434]">{error}</span>
                      <button
                        onClick={load}
                        className="mt-1 text-[12.5px] font-medium text-[#EA6A20] hover:underline"
                      >
                        Reintentar
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                filtered.map((m) => (
                  <tr
                    key={m.id}
                    className="cursor-pointer border-t border-slate-100 text-[13.5px] hover:bg-slate-50"
                  >
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-800">{m.nombre}</div>
                      <div className="text-[12px] text-slate-400">{m.detalle}</div>
                    </td>
                    <td className="px-3 py-3.5 text-slate-600">{m.marca}</td>
                    <td className="px-3 py-3.5 text-slate-600">{m.serie}</td>
                    <td className="px-3 py-3.5 text-slate-700">{m.cliente}</td>
                    <td className="px-3 py-3.5 text-slate-600">{m.tipo}</td>
                    <td className="px-3 py-3.5 text-slate-600">{m.ultimaMant}</td>
                    <td className="px-3 py-3.5">
                      <EstadoBadge estado={m.estado} />
                    </td>
                    <td className="px-3 py-3.5 text-right text-slate-300">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))}

              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-[13.5px] text-slate-400">
                    No hay máquinas que coincidan con este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 text-[12.5px] text-slate-400">
          <span>
            Mostrando 1 a {filtered.length} de {filtered.length} resultados
          </span>
          <div className="flex items-center gap-1">
            <button className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50">
              ‹
            </button>
            <span className="px-2 text-slate-600">1 / 1</span>
            <button className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50">
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}