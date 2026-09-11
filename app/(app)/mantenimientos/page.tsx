"use client";

/**
 * MantenimientosView
 * ---------------------------------------------------------------
 * Mismo patrón visual y de código que MaquinasView / ClientesView:
 *  - Trae los mantenimientos desde Supabase directamente en el cliente
 *  - Tabs + búsqueda sincronizados con la URL (?estado=&q=&page=)
 *  - Tarjeta blanca con header p-4, tabs/búsqueda en una fila,
 *    tabla text-xs con encabezados uppercase, paginación compacta
 *
 * AJUSTES QUE DEBES REVISAR ANTES DE USAR:
 *  1. La tabla `mantenimientos` NO tiene columna `numero_mantencion`,
 *     `tipo`, `frecuencia` ni `estado`. Este componente:
 *       - Muestra un folio corto derivado del `id` (uuid) en vez de
 *         un número tipo "MT-2026-00042". Si quieres folios
 *         secuenciales reales, hay que agregar esa columna a la
 *         tabla (como `numero_orden` en ordenes_servicio).
 *       - DERIVA el estado en el cliente:
 *           resultado != null            -> "Completado"
 *           resultado == null y
 *             proxima_revision < hoy     -> "Vencido"
 *           resultado == null y
 *             proxima_revision >= hoy    -> "Programado"
 *         "En Proceso" no tiene ninguna señal en el schema actual,
 *         así que ese tab queda siempre en 0. Si manejas ese estado
 *         en algún otro lado, dímelo y lo agrego a la lógica.
 *  2. Asume que `usuarios` tiene una columna `nombre` para mostrar
 *     el técnico. Si se llama distinto, ajusta el `.select()` de
 *     `tecnico:usuarios(nombre)` más abajo.
 *  3. La búsqueda por texto solo filtra sobre `descripcion` (columna
 *     propia de `mantenimientos`). Filtrar por nombre de cliente o
 *     máquina requeriría un `!inner` join con PostgREST embebido;
 *     lo dejé fuera para no complicar la primera versión.
 *  4. Como el estado se deriva en el cliente (no existe como columna
 *     en la tabla), el filtro por tab y la paginación se hacen en
 *     memoria después de calcular el estado de cada fila — a
 *     diferencia de MaquinasView, que pagina directo en Supabase con
 *     `.range()`. Si la tabla crece mucho, conviene agregar una
 *     columna/vista real de estado para paginar del lado del servidor.
 *
 * NOTA (fix de build):
 *  Este componente usa `useSearchParams()`, que en Next.js exige un
 *  boundary de <Suspense> alrededor cuando la página se prerenderiza
 *  estáticamente. Por eso el export por defecto es un wrapper con
 *  Suspense que renderiza `MantenimientosViewInner`, igual que en
 *  ClientesView.
 * ---------------------------------------------------------------
 */

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const supabase = createClient();

// -----------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------

type Estado = "Programado" | "En Proceso" | "Completado" | "Vencido";
type TabKey = "todos" | Estado;

interface MantenimientoRow {
  id: string;
  fecha_revision: string | null;
  proxima_revision: string;
  requiere_mantenimiento: boolean | null;
  descripcion: string;
  resultado: string | null;
  informe_no_reparada: string | null;
  created_at: string;
  maquina: {
    id: string;
    nombre: string;
    numero_serie: string | null;
    cliente: {
      id: string;
      nombre_razon_social: string;
    } | null;
  } | null;
  tecnico: {
    id: string;
    nombre: string;
  } | null;
}

// -----------------------------------------------------------------------
// Tabs
// -----------------------------------------------------------------------

const TABS: { key: TabKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "Programado", label: "Programados" },
  { key: "En Proceso", label: "En Proceso" },
  { key: "Completado", label: "Completados" },
  { key: "Vencido", label: "Vencidos" },
];

// -----------------------------------------------------------------------
// Estilos por estado (mismo formato que ESTADO_STYLES de MaquinasView)
// -----------------------------------------------------------------------

const ESTADO_STYLES: Record<string, string> = {
  Programado: "bg-orange-50 text-orange-600",
  "En Proceso": "bg-blue-50 text-blue-600",
  Completado: "bg-green-50 text-green-600",
  Vencido: "bg-red-50 text-red-600",
};

function formatFallback(estado: string) {
  return estado
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function Badge({
  estado,
  styles,
}: {
  estado: string;
  styles: Record<string, string>;
}) {
  const style = styles[estado] ?? "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex flex-shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium ${style}`}
    >
      {formatFallback(estado)}
    </span>
  );
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/** Folio corto y legible derivado del uuid, mientras no exista una
 *  columna de numeración secuencial en la tabla. */
function folioCorto(id: string) {
  return `MT-${id.slice(0, 8).toUpperCase()}`;
}

function computeEstado(m: MantenimientoRow): Estado {
  if (m.resultado) return "Completado";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const proxima = new Date(m.proxima_revision);

  return proxima < hoy ? "Vencido" : "Programado";
}

function formatFecha(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-CL");
}

// -----------------------------------------------------------------------
// Componente principal (export por defecto)
// ---------------------------------------------------------------------
// Envuelto en <Suspense> porque internamente usa useSearchParams(),
// requerido por Next.js para el prerender estático de la página.
// -----------------------------------------------------------------------

export default function MantenimientosView() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-400">
          Cargando mantenimientos...
        </div>
      }
    >
      <MantenimientosViewInner />
    </Suspense>
  );
}

// -----------------------------------------------------------------------
// Componente interno con la lógica original
// -----------------------------------------------------------------------

function MantenimientosViewInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<TabKey>(
    () => (searchParams.get("estado") as TabKey) || "todos",
  );
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [page, setPage] = useState(() => {
    const raw = Number(searchParams.get("page"));
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  });
  const pageSize = 10;

  const [rows, setRows] = useState<MantenimientoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<TabKey, number>>({
    todos: 0,
    Programado: 0,
    "En Proceso": 0,
    Completado: 0,
    Vencido: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const url = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
    router.replace(url, { scroll: false });
  }

  function goToTab(key: TabKey) {
    setTab(key);
    setPage(1);
    updateParams({ estado: key === "todos" ? null : key, page: null });
  }

  function applySearch(value: string) {
    setSearch(value);
    setPage(1);
    updateParams({ q: value || null, page: null });
  }

  function goToPage(next: number) {
    setPage(next);
    updateParams({ page: next > 1 ? String(next) : null });
  }

  // -----------------------------------------------------------------
  // Fetch: mantenimientos + máquina + cliente + técnico
  // -----------------------------------------------------------------
  // El estado se deriva en el cliente, así que traemos todo lo que
  // matchea la búsqueda y filtramos/paginamos en memoria.
  // -----------------------------------------------------------------

  const fetchMantenimientos = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("mantenimientos")
      .select(
        `id, fecha_revision, proxima_revision, requiere_mantenimiento,
         descripcion, resultado, informe_no_reparada, created_at,
         maquina:maquinas ( id, nombre, numero_serie,
           cliente:clientes ( id, nombre_razon_social ) ),
         tecnico:usuarios ( id, nombre )`,
      )
      .order("proxima_revision", { ascending: true });

    if (search) {
      query = query.ilike("descripcion", `%${search}%`);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      setError(queryError.message);
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    const all = (data as unknown as MantenimientoRow[]) ?? [];

    const nextCounts: Record<TabKey, number> = {
      todos: all.length,
      Programado: 0,
      "En Proceso": 0,
      Completado: 0,
      Vencido: 0,
    };
    for (const m of all) {
      nextCounts[computeEstado(m)]++;
    }
    setCounts(nextCounts);

    const filtered =
      tab === "todos" ? all : all.filter((m) => computeEstado(m) === tab);

    setTotal(filtered.length);
    setRows(filtered.slice((page - 1) * pageSize, page * pageSize));
    setLoading(false);
  }, [search, tab, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchMantenimientos();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchMantenimientos]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="rounded-xl px-4 border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h2 className="text-base font-bold text-gray-900">Mantenimientos</h2>
        <button className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-700">
          + Nuevo Mantenimiento
        </button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => goToTab(t.key)}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            <span className="ml-1 text-[10px] text-gray-400">
              {counts[t.key]}
            </span>
          </button>
        ))}
        <div className="border-b border-gray-200 p-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por descripción..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                applySearch(searchInput);
              }
            }}
            className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-gray-400">
              <th className="px-4 py-2 font-medium">N° Mantención</th>
              <th className="px-4 py-2 font-medium">Fecha Revisión</th>
              <th className="px-4 py-2 font-medium">Próxima Revisión</th>
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium">Máquina</th>
              <th className="px-4 py-2 font-medium">Descripción</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Técnico</th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  Cargando mantenimientos...
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-red-500">
                  Error al cargar mantenimientos: {error}
                </td>
              </tr>
            )}

            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  No hay mantenciones que coincidan con este filtro.
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              rows.map((m) => {
                const estado = computeEstado(m);

                return (
                  <tr
                    key={m.id}
                    className="group cursor-pointer transition-colors duration-150 hover:bg-blue-50 active:bg-orange-50"
                  >
                    <td className="px-4 py-1.5 font-semibold text-gray-900 transition-colors group-hover:text-orange-600">
                      {folioCorto(m.id)}
                    </td>
                    <td className="px-4 py-1.5 text-gray-700">
                      {formatFecha(m.fecha_revision)}
                    </td>
                    <td className="px-4 py-1.5 text-gray-700">
                      {formatFecha(m.proxima_revision)}
                    </td>
                    <td className="px-4 py-1.5 text-gray-700">
                      {m.maquina?.cliente?.nombre_razon_social ?? "—"}
                    </td>
                    <td className="px-4 py-1.5">
                      <div className="text-gray-900">
                        {m.maquina?.nombre ?? "—"}
                      </div>
                      {m.maquina?.numero_serie && (
                        <div className="text-[10px] leading-tight text-gray-400">
                          N° {m.maquina.numero_serie}
                        </div>
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-1.5 text-gray-700">
                      {m.descripcion}
                    </td>
                    <td className="px-4 py-1.5">
                      <Badge estado={estado} styles={ESTADO_STYLES} />
                    </td>
                    <td className="px-4 py-1.5 text-gray-700">
                      {m.tecnico?.nombre ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right text-gray-300 transition-colors group-hover:text-orange-500">
                      ›
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-1 text-xs text-gray-400">
        <span>
          Mostrando {from} a {to} de {total} resultados
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹
          </button>
          <span className="px-2">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}