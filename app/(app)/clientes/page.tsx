"use client";

/**
 * ClientesView
 * ---------------------------------------------------------------
 * - Lista clientes desde Supabase.
 * - Búsqueda por nombre/razón social y RUT.
 * - Paginación sincronizada con la URL (?q=&page=).
 * - Al hacer click en una fila abre un Drawer.
 * - El Drawer permite editar los datos del cliente.
 * - El Drawer muestra máquinas y órdenes relacionadas.
 *
 * IMPORTANTE:
 * Las máquinas de un cliente se relacionan mediante
 * `maquinas_cliente`, por lo que NO se consulta `maquinas.cliente_id`.
 */

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import NuevoClienteModal from "./nuevo/NuevoClienteModal";

const supabase = createClient();

// -----------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------

interface ClienteListItem {
  id: string;
  nombre_razon_social: string;
  rut: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  ciudad: string | null;
  created_at: string;
}

type ClienteDetalle = ClienteListItem;

interface MaquinaItem {
  id: string;
  nombre: string;
  tipo: string | null;
  estado: string | null;
  numero_serie: string | null;
  modelo?: string | null;
}

interface OrdenItem {
  id: string;
  numero_orden: string;
  estado: string;
  created_at: string;
  maquina: {
    nombre: string;
  } | null;
}

// -----------------------------------------------------------------------
// Estados
// -----------------------------------------------------------------------

const ESTADO_MAQUINA_STYLES: Record<string, string> = {
  operativa: "bg-green-50 text-green-600",
  en_mantencion: "bg-orange-50 text-orange-600",
  fuera_servicio: "bg-red-50 text-red-600",
};

const ESTADO_ORDEN_STYLES: Record<string, string> = {
  recepcion: "bg-orange-50 text-orange-600",
  diagnostico: "bg-purple-50 text-purple-600",
  esperando_repuestos: "bg-pink-50 text-pink-600",
  repuestos: "bg-pink-50 text-pink-600",
  reparacion: "bg-orange-50 text-orange-600",
  lista_para_entrega: "bg-blue-50 text-blue-600",
  entregada: "bg-green-50 text-green-600",
  rechazada: "bg-red-50 text-red-600",
  no_reparada: "bg-gray-100 text-gray-600",
};

// -----------------------------------------------------------------------
// Utilidades
// -----------------------------------------------------------------------

function formatFallback(estado: string | null | undefined) {
  if (!estado) return "Sin estado";

  return estado
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function Badge({
  estado,
  styles,
}: {
  estado: string | null | undefined;
  styles: Record<string, string>;
}) {
  const normalized = estado ?? "";
  const style = styles[normalized] ?? "bg-gray-100 text-gray-600";

  return (
    <span
      className={`inline-flex flex-shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium ${style}`}
    >
      {formatFallback(estado)}
    </span>
  );
}

// -----------------------------------------------------------------------
// Componente principal (export por defecto)
// ---------------------------------------------------------------------
// Se exporta envuelto en <Suspense> porque internamente usa
// useSearchParams(), y Next.js exige un boundary de Suspense
// alrededor de cualquier componente que use ese hook cuando la
// página se prerenderiza estáticamente.
// -----------------------------------------------------------------------

export default function ClientesView() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-400">
          Cargando clientes...
        </div>
      }
    >
      <ClientesViewInner />
    </Suspense>
  );
}

// -----------------------------------------------------------------------
// Componente interno con la lógica original
// -----------------------------------------------------------------------

function ClientesViewInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("q") ?? "",
  );

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");

  const [page, setPage] = useState(() => {
    const raw = Number(searchParams.get("page"));

    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  });

  const pageSize = 10;

  const [clientes, setClientes] = useState<ClienteListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedClienteId = searchParams.get("cliente");

  const [openNuevoCliente, setOpenNuevoCliente] = useState(false);

  // ---------------------------------------------------------------------
  // Sincronizar estado local si cambia la URL externamente
  // ---------------------------------------------------------------------

  useEffect(() => {
    const urlSearch = searchParams.get("q") ?? "";

    const rawPage = Number(searchParams.get("page"));
    const urlPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

    setSearchInput(urlSearch);
    setSearch(urlSearch);
    setPage(urlPage);
  }, [searchParams]);

  // ---------------------------------------------------------------------
  // URL
  // ---------------------------------------------------------------------

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const queryString = params.toString();

    const url = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(url, { scroll: false });
  }

  function applySearch(value: string) {
    const normalized = value.trim();

    setSearchInput(value);
    setSearch(normalized);
    setPage(1);

    updateParams({
      q: normalized || null,
      page: null,
    });
  }

  function goToPage(next: number) {
    setPage(next);

    updateParams({
      page: next > 1 ? String(next) : null,
    });
  }

  function selectCliente(clienteId: string | null, replace = false) {
    const params = new URLSearchParams(searchParams.toString());

    if (clienteId) {
      params.set("cliente", clienteId);
    } else {
      params.delete("cliente");
    }

    const queryString = params.toString();

    const url = queryString ? `${pathname}?${queryString}` : pathname;

    if (replace) {
      router.replace(url, { scroll: false });
    } else {
      router.push(url, { scroll: false });
    }
  }

  // ---------------------------------------------------------------------
  // Cargar clientes
  // ---------------------------------------------------------------------

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("clientes")
      .select(
        `
          id,
          nombre_razon_social,
          rut,
          telefono,
          correo,
          direccion,
          ciudad,
          created_at
        `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (search) {
      const safeSearch = search.replace(/,/g, " ");

      query = query.or(
        `nombre_razon_social.ilike.%${safeSearch}%,rut.ilike.%${safeSearch}%`,
      );
    }

    const {
      data,
      count,
      error: queryError,
    } = await query.range((page - 1) * pageSize, page * pageSize - 1);

    if (queryError) {
      console.error("Error cargando clientes:", queryError);

      setError(queryError.message);
      setClientes([]);
      setTotal(0);
      setLoading(false);

      return;
    }

    setClientes((data as unknown as ClienteListItem[]) ?? []);

    setTotal(count ?? 0);
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    void fetchClientes();
  }, [fetchClientes]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;

  const to = Math.min(page * pageSize, total);

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4">
      {/* ------------------------------------------------------------- */}
      {/* CABECERA */}
      {/* ------------------------------------------------------------- */}

      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h2 className="text-base font-bold text-gray-900">Clientes</h2>

        <button
          type="button"
          onClick={() => setOpenNuevoCliente(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-700"
        >
          + Nuevo Cliente
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BUSCADOR */}
      {/* ------------------------------------------------------------- */}

      <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-2">
        <span className="text-xs text-gray-400">
          {total} cliente{total === 1 ? "" : "s"} registrado
          {total === 1 ? "" : "s"}
        </span>

        <input
          type="text"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              applySearch(searchInput);
            }
          }}
          placeholder="Buscar por nombre o RUT..."
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TABLA */}
      {/* ------------------------------------------------------------- */}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-gray-400">
              <th className="px-4 py-2 font-medium">Nombre / Razón Social</th>

              <th className="px-4 py-2 font-medium">RUT</th>

              <th className="px-4 py-2 font-medium">Teléfono</th>

              <th className="px-4 py-2 font-medium">Correo</th>

              <th className="px-4 py-2 font-medium">Ciudad</th>

              <th className="px-4 py-2 font-medium">Registrado</th>

              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {/* Cargando */}

            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  Cargando clientes...
                </td>
              </tr>
            )}

            {/* Error */}

            {!loading && error && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-red-500">
                  Error al cargar clientes: {error}
                </td>
              </tr>
            )}

            {/* Sin resultados */}

            {!loading && !error && clientes.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  No hay clientes que coincidan con esta búsqueda.
                </td>
              </tr>
            )}

            {/* Clientes */}

            {!loading &&
              !error &&
              clientes.map((cliente) => (
                <tr
                  key={cliente.id}
                  onClick={() => selectCliente(cliente.id)}
                  className="group cursor-pointer transition-colors duration-150 hover:bg-blue-50 active:bg-orange-50"
                >
                  <td className="px-4 py-2.5 font-semibold text-gray-900 transition-colors group-hover:text-orange-600">
                    {cliente.nombre_razon_social}
                  </td>

                  <td className="px-4 py-2.5 text-gray-700">{cliente.rut}</td>

                  <td className="px-4 py-2.5 text-gray-700">
                    {cliente.telefono ?? "—"}
                  </td>

                  <td className="px-4 py-2.5 text-gray-700">
                    {cliente.correo ?? "—"}
                  </td>

                  <td className="px-4 py-2.5 text-gray-700">
                    {cliente.ciudad ?? "—"}
                  </td>

                  <td className="px-4 py-2.5 text-gray-500">
                    {new Date(cliente.created_at).toLocaleDateString("es-CL")}
                  </td>

                  <td className="px-2 py-2.5 text-right text-gray-300 transition-colors group-hover:text-orange-500">
                    ›
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PAGINACIÓN */}
      {/* ------------------------------------------------------------- */}

      <div className="flex items-center justify-between px-4 py-1 text-xs text-gray-400">
        <span>
          Mostrando {from} a {to} de {total} resultados
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="cursor-pointer rounded-md border border-gray-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹
          </button>

          <span className="px-2">
            {page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
            className="cursor-pointer rounded-md border border-gray-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DRAWER */}
      {/* ------------------------------------------------------------- */}

      {selectedClienteId && (
        <ClienteDrawer
          clienteId={selectedClienteId}
          onClose={() => selectCliente(null, true)}
          onUpdated={fetchClientes}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* NUEVO CLIENTE */}
      {/* ------------------------------------------------------------- */}

      <NuevoClienteModal
        open={openNuevoCliente}
        onClose={() => setOpenNuevoCliente(false)}
        onCreated={fetchClientes}
      />
    </div>
  );
}

// =======================================================================
// DRAWER DE CLIENTE
// =======================================================================

type DrawerTab = "resumen" | "maquinas" | "ordenes";

function ClienteDrawer({
  clienteId,
  onClose,
  onUpdated,
}: {
  clienteId: string;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<DrawerTab>("resumen");

  const [cliente, setCliente] = useState<ClienteDetalle | null>(null);

  const [loading, setLoading] = useState(true);

  const [detalleError, setDetalleError] = useState<string | null>(null);

  const [maquinas, setMaquinas] = useState<MaquinaItem[] | null>(null);

  const [ordenes, setOrdenes] = useState<OrdenItem[] | null>(null);

  const [maquinasError, setMaquinasError] = useState<string | null>(null);

  const [ordenesError, setOrdenesError] = useState<string | null>(null);

  // ---------------------------------------------------------------------
  // Edición
  // ---------------------------------------------------------------------

  const [isEditing, setIsEditing] = useState(false);

  const [saving, setSaving] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre_razon_social: "",
    rut: "",
    telefono: "",
    correo: "",
    direccion: "",
    ciudad: "",
  });

  // ---------------------------------------------------------------------
  // Iniciar edición
  // ---------------------------------------------------------------------

  function startEditing() {
    if (!cliente) return;

    setActiveTab("resumen");

    setForm({
      nombre_razon_social: cliente.nombre_razon_social ?? "",
      rut: cliente.rut ?? "",
      telefono: cliente.telefono ?? "",
      correo: cliente.correo ?? "",
      direccion: cliente.direccion ?? "",
      ciudad: cliente.ciudad ?? "",
    });

    setSaveError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setSaveError(null);
  }

  // ---------------------------------------------------------------------
  // Guardar cliente
  // ---------------------------------------------------------------------

  async function handleSave() {
    if (!cliente) return;

    const nombre = form.nombre_razon_social.trim();
    const rut = form.rut.trim();

    if (!nombre) {
      setSaveError("El nombre / razón social es obligatorio.");
      return;
    }

    if (!rut) {
      setSaveError("El RUT es obligatorio.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const { data, error } = await supabase
      .from("clientes")
      .update({
        nombre_razon_social: nombre,
        rut,
        telefono: form.telefono.trim() || null,
        correo: form.correo.trim() || null,
        direccion: form.direccion.trim() || null,
        ciudad: form.ciudad.trim() || null,
      })
      .eq("id", clienteId)
      .select(
        `
          id,
          nombre_razon_social,
          rut,
          telefono,
          correo,
          direccion,
          ciudad,
          created_at
        `,
      )
      .single();

    if (error) {
      console.error("Error guardando cliente:", error);

      setSaveError(
        error.code === "23505"
          ? "Ya existe un cliente con ese RUT."
          : error.message,
      );

      setSaving(false);
      return;
    }

    setCliente(data as unknown as ClienteDetalle);

    setSaving(false);
    setIsEditing(false);

    onUpdated?.();
  }

  // ---------------------------------------------------------------------
  // Cargar detalle del cliente
  // ---------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function fetchDetalle() {
      setLoading(true);
      setDetalleError(null);

      const { data, error } = await supabase
        .from("clientes")
        .select(
          `
            id,
            nombre_razon_social,
            rut,
            telefono,
            correo,
            direccion,
            ciudad,
            created_at
          `,
        )
        .eq("id", clienteId)
        .single();

      if (cancelled) return;

      if (error) {
        console.error("Error cargando detalle del cliente:", error);

        setCliente(null);
        setDetalleError(error.message);
      } else {
        setCliente(data as unknown as ClienteDetalle);
      }

      setLoading(false);
    }

    void fetchDetalle();

    return () => {
      cancelled = true;
    };
  }, [clienteId]);

  // ---------------------------------------------------------------------
  // Cargar máquinas y órdenes según tab
  // ---------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function fetchMaquinas() {
      setMaquinasError(null);

      /*
       * IMPORTANTE:
       *
       * Las máquinas del cliente se relacionan mediante
       * `maquinas_cliente`.
       *
       * No usamos:
       *
       *   .from("maquinas").eq("cliente_id", clienteId)
       *
       * porque esa relación no es la que usa actualmente
       * la aplicación para clientes.
       */

      const { data: relaciones, error: relacionesError } = await supabase
        .from("maquinas_cliente")
        .select(
          `
            maquina_id,
            maquinas (
              id,
              nombre,
              modelo,
              tipo,
              estado,
              numero_serie
            )
          `,
        )
        .eq("cliente_id", clienteId);

      if (cancelled) return;

      if (relacionesError) {
        console.error(
          "Error cargando relación cliente-máquinas:",
          relacionesError,
        );

        setMaquinas([]);
        setMaquinasError(relacionesError.message);

        return;
      }

      const mapped = (relaciones ?? [])
        .map((row) => {
          const maquina = Array.isArray(row.maquinas)
            ? (row.maquinas[0] ?? null)
            : row.maquinas;

          if (!maquina) {
            return null;
          }

          return {
            id: maquina.id,
            nombre: maquina.nombre,
            modelo: maquina.modelo ?? null,
            tipo: maquina.tipo ?? null,
            estado: maquina.estado ?? null,
            numero_serie: maquina.numero_serie ?? null,
          };
        })
        .filter((maquina) => maquina !== null) as MaquinaItem[];

      setMaquinas(mapped);
    }

    async function fetchOrdenes() {
      setOrdenesError(null);

      const { data, error } = await supabase
        .from("ordenes_servicio")
        .select(
          `
            id,
            numero_orden,
            estado,
            created_at,
            maquina:maquinas (
              nombre
            )
          `,
        )
        .eq("cliente_id", clienteId)
        .order("created_at", {
          ascending: false,
        });

      if (cancelled) return;

      if (error) {
        console.error("Error cargando órdenes del cliente:", error);

        setOrdenes([]);
        setOrdenesError(error.message);

        return;
      }

      const mapped: OrdenItem[] = (data ?? []).map((row) => {
        const maquina = Array.isArray(row.maquina)
          ? (row.maquina[0] ?? null)
          : (row.maquina ?? null);

        return {
          id: row.id,
          numero_orden: row.numero_orden,
          estado: row.estado,
          created_at: row.created_at,
          maquina,
        };
      });

      setOrdenes(mapped);
    }

    if (activeTab === "maquinas" && maquinas === null) {
      void fetchMaquinas();
    }

    if (activeTab === "ordenes" && ordenes === null) {
      void fetchOrdenes();
    }

    return () => {
      cancelled = true;
    };
  }, [activeTab, clienteId, maquinas, ordenes]);

  // ---------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------

  const drawerTabs: {
    key: DrawerTab;
    label: string;
  }[] = [
    {
      key: "resumen",
      label: "Resumen",
    },
    {
      key: "maquinas",
      label: "Máquinas",
    },
    {
      key: "ordenes",
      label: "Órdenes",
    },
  ];

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

      {/* Drawer */}

      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl sm:max-w-lg lg:max-w-2xl">
        {/* ----------------------------------------------------------- */}
        {/* HEADER */}
        {/* ----------------------------------------------------------- */}

        <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4">
          <div className="min-w-0">
            <div className="text-xs text-gray-400">Cliente</div>

            <div className="truncate text-lg font-semibold text-gray-900">
              {cliente?.nombre_razon_social ?? "..."}
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {cliente && !isEditing && (
              <button
                type="button"
                onClick={startEditing}
                className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Editar
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* TABS */}
        {/* ----------------------------------------------------------- */}

        <div
          className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-4 [&::-webkit-scrollbar]:hidden"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {drawerTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-orange-600 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ----------------------------------------------------------- */}
        {/* CONTENIDO */}
        {/* ----------------------------------------------------------- */}

        <div className="flex-1 overflow-y-auto p-6">
          {/* ========================================================= */}
          {/* CARGANDO */}
          {/* ========================================================= */}

          {loading && (
            <p className="text-sm text-gray-400">Cargando detalle...</p>
          )}

          {/* ========================================================= */}
          {/* ERROR DETALLE */}
          {/* ========================================================= */}

          {!loading && detalleError && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-600">
                No se pudo cargar el cliente.
              </p>

              <p className="mt-1 text-xs text-red-500">{detalleError}</p>
            </div>
          )}

          {/* ========================================================= */}
          {/* RESUMEN */}
          {/* ========================================================= */}

          {!loading &&
            !detalleError &&
            cliente &&
            activeTab === "resumen" &&
            !isEditing && (
              <div className="space-y-6">
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">
                    Información General
                  </h3>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm lg:grid-cols-3">
                    <div>
                      <div className="text-gray-400">RUT</div>

                      <div className="font-medium text-gray-900">
                        {cliente.rut}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400">Teléfono</div>

                      <div className="font-medium text-gray-900">
                        {cliente.telefono ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400">Correo</div>

                      <div className="font-medium text-gray-900">
                        {cliente.correo ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400">Ciudad</div>

                      <div className="font-medium text-gray-900">
                        {cliente.ciudad ?? "—"}
                      </div>
                    </div>

                    <div className="col-span-2 lg:col-span-3">
                      <div className="text-gray-400">Dirección</div>

                      <div className="font-medium text-gray-900">
                        {cliente.direccion ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400">Cliente desde</div>

                      <div className="font-medium text-gray-900">
                        {new Date(cliente.created_at).toLocaleDateString(
                          "es-CL",
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

          {/* ========================================================= */}
          {/* EDITAR CLIENTE */}
          {/* ========================================================= */}

          {!loading &&
            !detalleError &&
            cliente &&
            activeTab === "resumen" &&
            isEditing && (
              <div className="space-y-5">
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">
                    Editar información
                  </h3>

                  <div className="space-y-4">
                    {/* Nombre */}

                    <div>
                      <label className="mb-1 block text-xs text-gray-400">
                        Nombre / Razón Social
                      </label>

                      <input
                        value={form.nombre_razon_social}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            nombre_razon_social: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    {/* RUT */}

                    <div>
                      <label className="mb-1 block text-xs text-gray-400">
                        RUT
                      </label>

                      <input
                        value={form.rut}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            rut: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    {/* Teléfono / correo */}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Teléfono
                        </label>

                        <input
                          value={form.telefono}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              telefono: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Correo
                        </label>

                        <input
                          type="email"
                          value={form.correo}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              correo: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    {/* Dirección */}

                    <div>
                      <label className="mb-1 block text-xs text-gray-400">
                        Dirección
                      </label>

                      <input
                        value={form.direccion}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            direccion: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    {/* Ciudad */}

                    <div>
                      <label className="mb-1 block text-xs text-gray-400">
                        Ciudad
                      </label>

                      <input
                        value={form.ciudad}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            ciudad: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  {/* Error */}

                  {saveError && (
                    <p className="mt-3 text-xs text-red-500">{saveError}</p>
                  )}

                  {/* Botones */}

                  <div className="mt-5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={
                        saving ||
                        !form.nombre_razon_social.trim() ||
                        !form.rut.trim()
                      }
                      className="rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={saving}
                      className="rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </section>
              </div>
            )}

          {/* ========================================================= */}
          {/* MÁQUINAS */}
          {/* ========================================================= */}

          {activeTab === "maquinas" && (
            <div className="space-y-2">
              {maquinas === null && (
                <p className="text-sm text-gray-400">Cargando máquinas...</p>
              )}

              {maquinasError && (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                  <p className="text-xs text-red-600">
                    Error al cargar máquinas:
                  </p>

                  <p className="mt-1 text-xs text-red-500">{maquinasError}</p>
                </div>
              )}

              {maquinas !== null && !maquinasError && maquinas.length === 0 && (
                <p className="text-sm text-gray-400">
                  Este cliente no tiene máquinas registradas.
                </p>
              )}

              {maquinas?.map((maquina) => (
                <div
                  key={maquina.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">
                      {maquina.nombre}
                    </div>

                    <div className="text-xs text-gray-400">
                      {maquina.tipo ?? "Máquina"}

                      {maquina.modelo ? ` · ${maquina.modelo}` : ""}

                      {maquina.numero_serie
                        ? ` · N° ${maquina.numero_serie}`
                        : ""}
                    </div>
                  </div>

                  <Badge
                    estado={maquina.estado}
                    styles={ESTADO_MAQUINA_STYLES}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ========================================================= */}
          {/* ÓRDENES */}
          {/* ========================================================= */}

          {activeTab === "ordenes" && (
            <div className="space-y-2">
              {ordenes === null && (
                <p className="text-sm text-gray-400">Cargando órdenes...</p>
              )}

              {ordenesError && (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                  <p className="text-xs text-red-600">
                    Error al cargar órdenes:
                  </p>

                  <p className="mt-1 text-xs text-red-500">{ordenesError}</p>
                </div>
              )}

              {ordenes !== null && !ordenesError && ordenes.length === 0 && (
                <p className="text-sm text-gray-400">
                  Este cliente no tiene órdenes de servicio.
                </p>
              )}

              {ordenes?.map((orden) => (
                <button
                  key={orden.id}
                  type="button"
                  onClick={() =>
                    router.push(
                      `/ordenes?orden=${encodeURIComponent(
                        orden.id,
                      )}&tab=resumen`,
                    )
                  }
                  className="group flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-200 p-3 text-left text-sm transition-colors hover:border-orange-200 hover:bg-orange-50"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 transition-colors group-hover:text-orange-600">
                      {orden.numero_orden}
                    </div>

                    <div className="text-xs text-gray-400">
                      {orden.maquina?.nombre ?? "—"} ·{" "}
                      {new Date(orden.created_at).toLocaleDateString("es-CL")}
                    </div>
                  </div>

                  <div className="ml-3 flex flex-shrink-0 items-center gap-2">
                    <Badge estado={orden.estado} styles={ESTADO_ORDEN_STYLES} />

                    <span className="text-gray-300 transition-colors group-hover:text-orange-500">
                      ›
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
