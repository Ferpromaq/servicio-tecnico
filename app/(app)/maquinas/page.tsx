"use client";

/**
 * MaquinasView
 * ---------------------------------------------------------------
 *  - Trae las máquinas desde Supabase directamente en el cliente
 *  - Mantiene tabs / búsqueda / paginación con estado local
 *  - Al hacer click en una máquina abre un Drawer con su detalle
 *  - Dentro del Drawer se pueden ver los Mantenimientos
 *  - Cada mantenimiento es clickeable y abre su detalle dentro
 *    del mismo Drawer, sin crear un segundo modal
 * ---------------------------------------------------------------
 */

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import NuevaMaquinaModal from "./nueva/Nuevamaquinamodal";

const supabase = createClient();

// -----------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------

type TabKey = "todas" | "operativa" | "en_mantencion" | "fuera_servicio";

const TABS: { key: TabKey; label: string; estados: string[] }[] = [
  { key: "todas", label: "Todas", estados: [] },
  { key: "operativa", label: "Operativas", estados: ["operativa"] },
  {
    key: "en_mantencion",
    label: "En Mantención",
    estados: ["en_mantencion"],
  },
  {
    key: "fuera_servicio",
    label: "Fuera de Servicio",
    estados: ["fuera_servicio"],
  },
];

const ESTADO_STYLES: Record<string, string> = {
  operativa: "bg-green-50 text-green-600",
  en_mantencion: "bg-orange-50 text-orange-600",
  fuera_servicio: "bg-red-50 text-red-600",

  Completado: "bg-green-50 text-green-600",
  Vencido: "bg-red-50 text-red-600",
  Programado: "bg-orange-50 text-orange-600",
};

const ESTADO_LABELS: Record<string, string> = {
  operativa: "Operativa",
  en_mantencion: "En Mantención",
  fuera_servicio: "Fuera de Servicio",
};

function formatEstadoFallback(estado: string) {
  return estado
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface MaquinaListItem {
  id: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  tipo: string;
  estado: string;
  created_at: string;
  cliente: {
    nombre_razon_social: string;
  } | null;
}

interface MaquinaDetalle {
  id: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  tipo: string;
  estado: string;
  created_at: string;
  updated_at: string;
  cliente: {
    nombre_razon_social: string;
    rut: string;
    telefono: string | null;
    correo: string | null;
    direccion: string | null;
  } | null;
}

interface HistorialItem {
  id: string;
  estado_anterior: string | null;
  estado_nuevo: string;
  created_at: string;
  usuario: {
    nombre: string;
  } | null;
}

interface MantenimientoItem {
  id: string;
  fecha_revision: string | null;
  proxima_revision: string;
  descripcion: string;
  resultado: string | null;
}

function estadoMantenimiento(
  m: MantenimientoItem,
): "Completado" | "Vencido" | "Programado" {
  if (m.resultado) {
    return "Completado";
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return new Date(m.proxima_revision) < hoy
    ? "Vencido"
    : "Programado";
}

// -----------------------------------------------------------------------
// Badge de estado
// -----------------------------------------------------------------------

function EstadoBadge({ estado }: { estado: string }) {
  const style =
    ESTADO_STYLES[estado] ?? "bg-gray-100 text-gray-600";

  const label =
    ESTADO_LABELS[estado] ??
    formatEstadoFallback(estado);

  return (
    <span
      className={`inline-flex flex-shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium ${style}`}
    >
      {label}
    </span>
  );
}

// -----------------------------------------------------------------------
// Componente principal
// -----------------------------------------------------------------------

export default function MaquinasView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<TabKey>(
    () => (searchParams.get("tab") as TabKey) || "todas",
  );

  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("q") ?? "",
  );

  const [search, setSearch] = useState(
    () => searchParams.get("q") ?? "",
  );

  const [page, setPage] = useState(() => {
    const raw = Number(searchParams.get("page"));

    return Number.isFinite(raw) && raw > 0
      ? raw
      : 1;
  });

  const pageSize = 10;

  const [maquinas, setMaquinas] = useState<MaquinaListItem[]>([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedMaquinaId =
    searchParams.get("maquina");

  const selectedMantenimientoId =
    searchParams.get("mantenimiento");

  const [openNuevaMaquina, setOpenNuevaMaquina] =
    useState(false);

  // ---------------------------------------------------------------------
  // URL params
  // ---------------------------------------------------------------------

  function updateParams(
    updates: Record<string, string | null>,
  ) {
    const params = new URLSearchParams(
      searchParams.toString(),
    );

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const url =
      params.size > 0
        ? `${pathname}?${params.toString()}`
        : pathname;

    router.replace(url, {
      scroll: false,
    });
  }

  function goToTab(key: TabKey) {
    setTab(key);
    setPage(1);

    updateParams({
      tab: key === "todas" ? null : key,
      page: null,
    });
  }

  function applySearch(value: string) {
    setSearch(value);
    setPage(1);

    updateParams({
      q: value || null,
      page: null,
    });
  }

  function goToPage(next: number) {
    setPage(next);

    updateParams({
      page: next > 1 ? String(next) : null,
    });
  }

  function selectMaquina(
    maquinaId: string | null,
    replace = false,
  ) {
    const params = new URLSearchParams(
      searchParams.toString(),
    );

    if (maquinaId) {
      params.set("maquina", maquinaId);
    } else {
      params.delete("maquina");

      // Si cerramos la máquina,
      // también eliminamos el mantenimiento seleccionado.
      params.delete("mantenimiento");
    }

    const url =
      params.size > 0
        ? `${pathname}?${params.toString()}`
        : pathname;

    const navigate =
      replace
        ? router.replace
        : router.push;

    navigate(url, {
      scroll: false,
    });
  }

  function selectMantenimiento(
    mantenimientoId: string | null,
    replace = false,
  ) {
    const params = new URLSearchParams(
      searchParams.toString(),
    );

    if (mantenimientoId) {
      params.set(
        "mantenimiento",
        mantenimientoId,
      );
    } else {
      params.delete("mantenimiento");
    }

    const url =
      params.size > 0
        ? `${pathname}?${params.toString()}`
        : pathname;

    const navigate =
      replace
        ? router.replace
        : router.push;

    navigate(url, {
      scroll: false,
    });
  }

  // ---------------------------------------------------------------------
  // Cargar máquinas
  // ---------------------------------------------------------------------

  const fetchMaquinas = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("maquinas")
      .select(
        `
          id,
          nombre,
          marca,
          modelo,
          numero_serie,
          tipo,
          estado,
          created_at,
          cliente:clientes (
            nombre_razon_social
          )
        `,
        {
          count: "exact",
        },
      )
      .order("created_at", {
        ascending: false,
      });

    const activeTab = TABS.find(
      (t) => t.key === tab,
    );

    if (
      activeTab &&
      activeTab.estados.length > 0
    ) {
      query = query.in(
        "estado",
        activeTab.estados,
      );
    }

    if (search) {
      query = query.or(
        `nombre.ilike.%${search}%,numero_serie.ilike.%${search}%`,
      );
    }

    const {
      data,
      count,
      error: queryError,
    } = await query.range(
      (page - 1) * pageSize,
      page * pageSize - 1,
    );

    if (queryError) {
      setError(queryError.message);
      setMaquinas([]);
      setTotal(0);
    } else {
      setMaquinas(
        (data as unknown as MaquinaListItem[]) ??
          [],
      );

      setTotal(count ?? 0);
    }

    setLoading(false);
  }, [tab, search, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchMaquinas();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchMaquinas]);

  const totalPages = Math.max(
    1,
    Math.ceil(total / pageSize),
  );

  const from =
    total === 0
      ? 0
      : (page - 1) * pageSize + 1;

  const to = Math.min(
    page * pageSize,
    total,
  );

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  return (
    <div className="rounded-xl border px-4 border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h2 className="text-base font-bold text-gray-900">
          Máquinas
        </h2>

        <button
          onClick={() =>
            setOpenNuevaMaquina(true)
          }
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-700"
        >
          + Nueva Máquina
        </button>
      </div>

      {/* Tabs y búsqueda */}

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
          </button>
        ))}

        <div className="border-b border-gray-200 p-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) =>
              setSearchInput(e.target.value)
            }
            placeholder="Buscar máquina o N° de serie..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                applySearch(searchInput);
              }
            }}
            className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Tabla */}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-gray-400">
              <th className="px-4 py-2 font-medium">
                Máquina
              </th>

              <th className="px-4 py-2 font-medium">
                Marca
              </th>

              <th className="px-4 py-2 font-medium">
                N° Serie
              </th>

              <th className="px-4 py-2 font-medium">
                Cliente
              </th>

              <th className="px-4 py-2 font-medium">
                Tipo
              </th>

              <th className="px-4 py-2 font-medium">
                Estado
              </th>

              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  Cargando máquinas...
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-red-500"
                >
                  Error al cargar máquinas: {error}
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              maquinas.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-gray-400"
                  >
                    No hay máquinas que coincidan con este filtro.
                  </td>
                </tr>
              )}

            {!loading &&
              !error &&
              maquinas.map((maquina) => (
                <tr
                  key={maquina.id}
                  onClick={() =>
                    selectMaquina(maquina.id)
                  }
                  className="group cursor-pointer transition-colors duration-150 hover:bg-blue-50 active:bg-orange-50"
                >
                  <td className="px-4 py-1.5">
                    <div className="font-semibold text-gray-900 transition-colors group-hover:text-orange-600">
                      {maquina.nombre}
                    </div>

                    {maquina.modelo && (
                      <div className="text-[10px] leading-tight text-gray-400">
                        {maquina.modelo}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-1.5 text-gray-700">
                    {maquina.marca ?? "—"}
                  </td>

                  <td className="px-4 py-1.5 text-gray-700">
                    {maquina.numero_serie ?? "—"}
                  </td>

                  <td className="px-4 py-1.5 text-gray-700">
                    {maquina.cliente
                      ?.nombre_razon_social ?? "—"}
                  </td>

                  <td className="px-4 py-1.5 text-gray-700">
                    {maquina.tipo}
                  </td>

                  <td className="px-4 py-1.5">
                    <EstadoBadge
                      estado={maquina.estado}
                    />
                  </td>

                  <td className="px-2 py-1.5 text-right text-gray-300 transition-colors group-hover:text-orange-500">
                    ›
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}

      <div className="flex items-center justify-between px-4 py-1 text-xs text-gray-400">
        <span>
          Mostrando {from} a {to} de {total} resultados
        </span>

        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() =>
              goToPage(page - 1)
            }
            className="rounded-md border border-gray-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹
          </button>

          <span className="px-2">
            {page} / {totalPages}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() =>
              goToPage(page + 1)
            }
            className="rounded-md border border-gray-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>

      {/* Drawer de máquina */}

      {selectedMaquinaId && (
        <MaquinaDrawer
          maquinaId={selectedMaquinaId}
          mantenimientoId={
            selectedMantenimientoId
          }
          onSelectMantenimiento={
            selectMantenimiento
          }
          onClose={() =>
            selectMaquina(null, true)
          }
          onUpdated={fetchMaquinas}
        />
      )}

      {/* Modal nueva máquina */}

      <NuevaMaquinaModal
        open={openNuevaMaquina}
        onClose={() =>
          setOpenNuevaMaquina(false)
        }
        onCreated={fetchMaquinas}
      />
    </div>
  );
}

// -----------------------------------------------------------------------
// Drawer
// -----------------------------------------------------------------------

type DrawerTab =
  | "resumen"
  | "mantenimientos"
  | "historial";

interface ClienteOption {
  id: string;
  nombre_razon_social: string;
}

function MaquinaDrawer({
  maquinaId,
  mantenimientoId,
  onSelectMantenimiento,
  onClose,
  onUpdated,
}: {
  maquinaId: string;
  mantenimientoId: string | null;
  onSelectMantenimiento: (
    mantenimientoId: string | null,
    replace?: boolean,
  ) => void;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [activeTab, setActiveTab] =
    useState<DrawerTab>("resumen");

  const [maquina, setMaquina] =
    useState<MaquinaDetalle | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [historial, setHistorial] =
    useState<HistorialItem[] | null>(null);

  const [mantenimientos, setMantenimientos] =
    useState<MantenimientoItem[] | null>(
      null,
    );

  // ---------------------------------------------------------------------
  // Edición
  // ---------------------------------------------------------------------

  const [isEditing, setIsEditing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [saveError, setSaveError] =
    useState<string | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    marca: "",
    modelo: "",
    numero_serie: "",
    estado: "operativa",
    cliente_id: null as string | null,
  });

  const [clienteQuery, setClienteQuery] =
    useState("");

  const [clienteResults, setClienteResults] =
    useState<ClienteOption[]>([]);

  const [clienteLabel, setClienteLabel] =
    useState("");

  const [searchingClientes, setSearchingClientes] =
    useState(false);

  function startEditing() {
    if (!maquina) return;

    setActiveTab("resumen");

    setForm({
      nombre: maquina.nombre ?? "",
      marca: maquina.marca ?? "",
      modelo: maquina.modelo ?? "",
      numero_serie:
        maquina.numero_serie ?? "",
      estado:
        maquina.estado ?? "operativa",
      cliente_id: null,
    });

    setClienteLabel(
      maquina.cliente?.nombre_razon_social ??
        "",
    );

    setClienteQuery("");
    setClienteResults([]);
    setSaveError(null);

    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setSaveError(null);
  }

  // ---------------------------------------------------------------------
  // Buscar clientes
  // ---------------------------------------------------------------------

  useEffect(() => {
    if (!isEditing) return;

    const q =
      clienteQuery.trim();

    if (q.length < 2) {
      setClienteResults([]);
      return;
    }

    setSearchingClientes(true);

    const timer =
      window.setTimeout(async () => {
        const { data } =
          await supabase
            .from("clientes")
            .select(
              "id, nombre_razon_social",
            )
            .ilike(
              "nombre_razon_social",
              `%${q}%`,
            )
            .limit(8);

        setClienteResults(
          (data as unknown as ClienteOption[]) ??
            [],
        );

        setSearchingClientes(false);
      }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    clienteQuery,
    isEditing,
  ]);

  function pickCliente(
    cliente: ClienteOption,
  ) {
    setForm((f) => ({
      ...f,
      cliente_id: cliente.id,
    }));

    setClienteLabel(
      cliente.nombre_razon_social,
    );

    setClienteQuery("");
    setClienteResults([]);
  }

  function clearCliente() {
    setForm((f) => ({
      ...f,
      cliente_id: null,
    }));

    setClienteLabel("");
  }

  // ---------------------------------------------------------------------
  // Guardar máquina
  // ---------------------------------------------------------------------

  async function handleSave() {
    if (!maquina) return;

    setSaving(true);
    setSaveError(null);

    const clienteUpdate =
      form.cliente_id !== null
        ? form.cliente_id
        : clienteLabel === "" &&
            maquina.cliente
          ? null
          : undefined;

    const payload: Record<
      string,
      unknown
    > = {
      nombre: form.nombre.trim(),
      marca:
        form.marca.trim() || null,
      modelo:
        form.modelo.trim() || null,
      numero_serie:
        form.numero_serie.trim() || null,
      estado: form.estado,
    };

    if (
      clienteUpdate !== undefined
    ) {
      payload.cliente_id =
        clienteUpdate;
    }

    const {
      data,
      error,
    } = await supabase
      .from("maquinas")
      .update(payload)
      .eq("id", maquinaId)
      .select(
        `
          id,
          nombre,
          marca,
          modelo,
          numero_serie,
          tipo,
          estado,
          created_at,
          updated_at,
          cliente:clientes (
            nombre_razon_social,
            rut,
            telefono,
            correo,
            direccion
          )
        `,
      )
      .single();

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    setMaquina(
      data as unknown as MaquinaDetalle,
    );

    setSaving(false);
    setIsEditing(false);

    onUpdated?.();
  }

  // ---------------------------------------------------------------------
  // Cargar detalle de máquina
  // ---------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function fetchDetalle() {
      setLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from("maquinas")
        .select(
          `
            id,
            nombre,
            marca,
            modelo,
            numero_serie,
            tipo,
            estado,
            created_at,
            updated_at,
            cliente:clientes (
              nombre_razon_social,
              rut,
              telefono,
              correo,
              direccion
            )
          `,
        )
        .eq("id", maquinaId)
        .single();

      if (!cancelled) {
        if (error) {
          console.error(
            error.message,
          );

          setMaquina(null);
        } else {
          setMaquina(
            data as unknown as MaquinaDetalle,
          );
        }

        setLoading(false);
      }
    }

    void fetchDetalle();

    return () => {
      cancelled = true;
    };
  }, [maquinaId]);

  // ---------------------------------------------------------------------
  // Cargar datos relacionados
  // ---------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function fetchRelacionados() {
      if (
        activeTab === "historial" &&
        historial === null
      ) {
        const { data } =
          await supabase
            .from("historial_estados")
            .select(
              `
                id,
                estado_anterior,
                estado_nuevo,
                created_at,
                usuario:usuarios (
                  nombre
                )
              `,
            )
            .eq(
              "origen_tipo",
              "maquina",
            )
            .eq(
              "origen_id",
              maquinaId,
            )
            .order(
              "created_at",
              {
                ascending: true,
              },
            );

        if (!cancelled) {
          setHistorial(
            (data as unknown as HistorialItem[]) ??
              [],
          );
        }
      }

      if (
        activeTab === "mantenimientos" &&
        mantenimientos === null
      ) {
        const { data } =
          await supabase
            .from("mantenimientos")
            .select(
              `
                id,
                fecha_revision,
                proxima_revision,
                descripcion,
                resultado
              `,
            )
            .eq(
              "maquina_id",
              maquinaId,
            )
            .order(
              "proxima_revision",
              {
                ascending: false,
              },
            );

        if (!cancelled) {
          setMantenimientos(
            (data as unknown as MantenimientoItem[]) ??
              [],
          );
        }
      }
    }

    void fetchRelacionados();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    maquinaId,
    historial,
    mantenimientos,
  ]);

  // Si hay un mantenimiento seleccionado,
  // mostramos automáticamente la sección correspondiente.
  useEffect(() => {
    if (mantenimientoId) {
      setActiveTab("mantenimientos");
    }
  }, [mantenimientoId]);

  const drawerTabs: {
    key: DrawerTab;
    label: string;
  }[] = [
    {
      key: "resumen",
      label: "Resumen",
    },
    {
      key: "mantenimientos",
      label: "Mantenimientos",
    },
    {
      key: "historial",
      label: "Historial",
    },
  ];

  const selectedMantenimiento =
    mantenimientoId
      ? mantenimientos?.find(
          (m) =>
            m.id === mantenimientoId,
        ) ?? null
      : null;

  function handleTabChange(
    key: DrawerTab,
  ) {
    setActiveTab(key);

    // Si estamos viendo un detalle
    // y cambiamos de pestaña,
    // cerramos el mantenimiento seleccionado.
    if (mantenimientoId) {
      onSelectMantenimiento(
        null,
        true,
      );
    }
  }

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  return (
    <>
      {/* Overlay */}

      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}

      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl sm:max-w-lg lg:max-w-2xl">
        {/* Header */}

        <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4">
          <div className="min-w-0">
            <div className="text-xs text-gray-400">
              Máquina
            </div>

            <div className="truncate text-lg font-semibold text-gray-900">
              {maquina?.nombre ?? "..."}
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {maquina &&
              !isEditing &&
              !mantenimientoId && (
                <EstadoBadge
                  estado={
                    maquina.estado
                  }
                />
              )}

            {maquina &&
              !isEditing &&
              !mantenimientoId && (
                <button
                  onClick={startEditing}
                  className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Editar
                </button>
              )}

            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}

        {!mantenimientoId && (
          <div
            className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-4 [&::-webkit-scrollbar]:hidden"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {drawerTabs.map((t) => (
              <button
                key={t.key}
                onClick={() =>
                  handleTabChange(
                    t.key,
                  )
                }
                className={`flex-shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                  activeTab ===
                  t.key
                    ? "border-orange-600 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Contenido */}

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <p className="text-sm text-gray-400">
              Cargando detalle...
            </p>
          )}

          {/* ------------------------------------------------------------- */}
          {/* DETALLE DEL MANTENIMIENTO */}
          {/* ------------------------------------------------------------- */}

          {!loading &&
            mantenimientoId && (
              <div
                key={mantenimientoId}
                className="drawer-fade-in space-y-6"
              >
                <button
                  onClick={() =>
                    onSelectMantenimiento(
                      null,
                      true,
                    )
                  }
                  className="inline-flex items-center gap-1 cursor-pointer text-sm font-medium text-gray-500 transition-colors hover:text-orange-600"
                >
                  ← Volver a Mantenimientos
                </button>

                {!selectedMantenimiento &&
                  mantenimientos === null && (
                    <p className="text-sm text-gray-400">
                      Cargando mantenimiento...
                    </p>
                  )}

                {!selectedMantenimiento &&
                  mantenimientos !== null && (
                    <p className="text-sm text-red-500">
                      No se encontró este mantenimiento.
                    </p>
                  )}

                {selectedMantenimiento && (
                  <>
                    <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-5">
                      <div>
                        <div className="mb-1 text-xs text-gray-400">
                          Mantenimiento
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900">
                          {
                            selectedMantenimiento.descripcion
                          }
                        </h3>
                      </div>

                      <EstadoBadge
                        estado={estadoMantenimiento(
                          selectedMantenimiento,
                        )}
                      />
                    </div>

                    {/* Información */}

                    <section>
                      <h4 className="mb-4 text-sm font-semibold text-gray-900">
                        Información
                      </h4>

                      <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                        <div>
                          <div className="text-xs text-gray-400">
                            Fecha de revisión
                          </div>

                          <div className="mt-1 font-medium text-gray-900">
                            {selectedMantenimiento.fecha_revision
                              ? new Date(
                                  selectedMantenimiento.fecha_revision,
                                ).toLocaleDateString(
                                  "es-CL",
                                )
                              : "Pendiente"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-400">
                            Próxima revisión
                          </div>

                          <div className="mt-1 font-medium text-gray-900">
                            {new Date(
                              selectedMantenimiento.proxima_revision,
                            ).toLocaleDateString(
                              "es-CL",
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-400">
                            Máquina
                          </div>

                          <div className="mt-1 font-medium text-gray-900">
                            {
                              maquina?.nombre
                            }
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-400">
                            Estado
                          </div>

                          <div className="mt-1">
                            <EstadoBadge
                              estado={estadoMantenimiento(
                                selectedMantenimiento,
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Descripción */}

                    <section>
                      <h4 className="mb-2 text-sm font-semibold text-gray-900">
                        Descripción
                      </h4>

                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">
                        {
                          selectedMantenimiento.descripcion
                        }
                      </div>
                    </section>

                    {/* Resultado */}

                    <section>
                      <h4 className="mb-2 text-sm font-semibold text-gray-900">
                        Resultado
                      </h4>

                      {selectedMantenimiento.resultado ? (
                        <div className="rounded-lg border border-green-100 bg-green-50 p-4 text-sm leading-relaxed text-gray-700">
                          {
                            selectedMantenimiento.resultado
                          }
                        </div>
                      ) : (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-400">
                          Este mantenimiento aún no tiene
                          un resultado registrado.
                        </div>
                      )}
                    </section>
                  </>
                )}
              </div>
            )}

          {/* ------------------------------------------------------------- */}
          {/* RESUMEN */}
          {/* ------------------------------------------------------------- */}

          {!loading &&
            maquina &&
            !mantenimientoId &&
            activeTab === "resumen" &&
            !isEditing && (
              <div className="drawer-fade-in space-y-6">
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">
                    Información General
                  </h3>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm lg:grid-cols-3">
                    <div>
                      <div className="text-gray-400">
                        Cliente
                      </div>

                      <div className="font-medium text-gray-900">
                        {maquina.cliente
                          ?.nombre_razon_social ?? (
                          <span className="text-gray-400">
                            Sin asignar
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400">
                        Teléfono
                      </div>

                      <div className="font-medium text-gray-900">
                        {maquina.cliente
                          ?.telefono ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400">
                        Marca
                      </div>

                      <div className="font-medium text-gray-900">
                        {maquina.marca ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400">
                        Modelo
                      </div>

                      <div className="font-medium text-gray-900">
                        {maquina.modelo ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400">
                        N° Serie
                      </div>

                      <div className="font-medium text-gray-900">
                        {maquina.numero_serie ??
                          "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400">
                        Tipo
                      </div>

                      <div className="font-medium text-gray-900">
                        {maquina.tipo}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400">
                        Fecha Registro
                      </div>

                      <div className="font-medium text-gray-900">
                        {new Date(
                          maquina.created_at,
                        ).toLocaleString(
                          "es-CL",
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

          {/* ------------------------------------------------------------- */}
          {/* EDICIÓN */}
          {/* ------------------------------------------------------------- */}

          {!loading &&
            maquina &&
            !mantenimientoId &&
            activeTab === "resumen" &&
            isEditing && (
              <div className="drawer-fade-in space-y-5">
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">
                    Editar información
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">
                        Nombre
                      </label>

                      <input
                        value={form.nombre}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            nombre:
                              e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Marca
                        </label>

                        <input
                          value={form.marca}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              marca:
                                e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Modelo
                        </label>

                        <input
                          value={form.modelo}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              modelo:
                                e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-gray-400">
                        N° Serie
                      </label>

                      <input
                        value={
                          form.numero_serie
                        }
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            numero_serie:
                              e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-gray-400">
                        Estado
                      </label>

                      <select
                        value={form.estado}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            estado:
                              e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="operativa">
                          Operativa
                        </option>

                        <option value="en_mantencion">
                          En Mantención
                        </option>

                        <option value="fuera_servicio">
                          Fuera de Servicio
                        </option>
                      </select>
                    </div>

                    <div className="relative">
                      <label className="mb-1 block text-xs text-gray-400">
                        Cliente
                      </label>

                      {clienteLabel ? (
                        <div className="flex items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-sm">
                          <span className="text-gray-900">
                            {clienteLabel}
                          </span>

                          <button
                            onClick={
                              clearCliente
                            }
                            className="text-xs text-gray-400 hover:text-red-500"
                          >
                            Quitar
                          </button>
                        </div>
                      ) : (
                        <input
                          value={
                            clienteQuery
                          }
                          onChange={(e) =>
                            setClienteQuery(
                              e.target.value,
                            )
                          }
                          placeholder="Buscar cliente por nombre..."
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      )}

                      {!clienteLabel &&
                        clienteQuery
                          .trim()
                          .length >= 2 && (
                          <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                            {searchingClientes && (
                              <div className="px-3 py-2 text-xs text-gray-400">
                                Buscando...
                              </div>
                            )}

                            {!searchingClientes &&
                              clienteResults.length ===
                                0 && (
                                <div className="px-3 py-2 text-xs text-gray-400">
                                  Sin resultados.
                                </div>
                              )}

                            {clienteResults.map(
                              (c) => (
                                <button
                                  key={c.id}
                                  onClick={() =>
                                    pickCliente(
                                      c,
                                    )
                                  }
                                  className="block w-full px-3 py-2 text-left text-sm hover:bg-orange-50"
                                >
                                  {
                                    c.nombre_razon_social
                                  }
                                </button>
                              ),
                            )}
                          </div>
                        )}
                    </div>
                  </div>

                  {saveError && (
                    <p className="mt-3 text-xs text-red-500">
                      {saveError}
                    </p>
                  )}

                  <div className="mt-5 flex items-center gap-2">
                    <button
                      onClick={
                        handleSave
                      }
                      disabled={
                        saving ||
                        !form.nombre.trim()
                      }
                      className="rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving
                        ? "Guardando..."
                        : "Guardar cambios"}
                    </button>

                    <button
                      onClick={
                        cancelEditing
                      }
                      disabled={saving}
                      className="rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </section>
              </div>
            )}

          {/* ------------------------------------------------------------- */}
          {/* LISTA DE MANTENIMIENTOS */}
          {/* ------------------------------------------------------------- */}

          {!mantenimientoId &&
            activeTab === "mantenimientos" && (
              <div className="drawer-fade-in space-y-2">
                {mantenimientos === null && (
                  <p className="text-sm text-gray-400">
                    Cargando mantenimientos...
                  </p>
                )}

                {mantenimientos !== null &&
                  mantenimientos.length ===
                    0 && (
                    <p className="text-sm text-gray-400">
                      No hay mantenimientos registrados
                      para esta máquina.
                    </p>
                  )}

                {mantenimientos?.map(
                  (m, index) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        onSelectMantenimiento(
                          m.id,
                        )
                      }
                      style={{
                        animationDelay: `${Math.min(index, 8) * 30}ms`,
                      }}
                      className="mant-row-in group flex w-full items-center cursor-pointer justify-between rounded-lg border border-gray-200 p-3 text-left text-sm transition-colors hover:border-orange-200 hover:bg-orange-50"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900 transition-colors group-hover:text-orange-600">
                          {
                            m.descripcion
                          }
                        </div>

                        <div className="text-xs text-gray-400">
                          Próxima revisión:{" "}
                          {new Date(
                            m.proxima_revision,
                          ).toLocaleDateString(
                            "es-CL",
                          )}

                          {m.fecha_revision &&
                            ` · Última: ${new Date(
                              m.fecha_revision,
                            ).toLocaleDateString(
                              "es-CL",
                            )}`}
                        </div>
                      </div>

                      <div className="ml-3 flex flex-shrink-0 items-center gap-3">
                        <EstadoBadge
                          estado={estadoMantenimiento(
                            m,
                          )}
                        />

                        <span className="text-gray-300 transition-colors group-hover:text-orange-500">
                          ›
                        </span>
                      </div>
                    </button>
                  ),
                )}
              </div>
            )}

          {/* ------------------------------------------------------------- */}
          {/* HISTORIAL */}
          {/* ------------------------------------------------------------- */}

          {!mantenimientoId &&
            activeTab === "historial" && (
              <div className="drawer-fade-in space-y-4">
                {historial === null && (
                  <p className="text-sm text-gray-400">
                    Cargando historial...
                  </p>
                )}

                {historial !== null &&
                  historial.length === 0 && (
                    <p className="text-sm text-gray-400">
                      Sin movimientos registrados.
                    </p>
                  )}

                {historial?.map((h) => (
                  <div
                    key={h.id}
                    className="flex gap-3 text-sm"
                  >
                    <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-orange-600" />

                    <div>
                      <div className="font-medium text-gray-900">
                        {h.estado_anterior
                          ? `${h.estado_anterior} → `
                          : ""}

                        {h.estado_nuevo}
                      </div>

                      <div className="text-xs text-gray-400">
                        {new Date(
                          h.created_at,
                        ).toLocaleString(
                          "es-CL",
                        )}

                        {h.usuario?.nombre
                          ? ` · ${h.usuario.nombre}`
                          : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Animaciones de entrada suaves para el contenido del drawer.
          - drawer-fade-in: fade + slide sutil, usado en resumen, edición,
            historial y en el detalle del mantenimiento (con key={id} para
            que se re-dispare al cambiar de un mantenimiento a otro).
          - mant-row-in: cada fila de la lista de mantenimientos entra con
            un pequeño stagger (delay incremental) para que se sienta más
            vivo en vez de aparecer todo de golpe. */}
      <style jsx>{`
        @keyframes drawerFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .drawer-fade-in {
          animation: drawerFadeIn 1000ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes mantRowIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .mant-row-in {
          animation: mantRowIn 220ms ease-out backwards;
        }
      `}</style>
    </>
  );
}