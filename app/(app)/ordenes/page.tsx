"use client";

/**
 * OrdenesServicioView
 * ---------------------------------------------------------------
 * Componente único (temporal, para revisar diseño) que:
 *  - Trae las órdenes desde Supabase directamente en el cliente
 *  - Mantiene tabs / búsqueda / paginación con estado local (sin URL params)
 *  - Al hacer click en una fila abre un Drawer con el detalle completo
 *
 * AJUSTES QUE DEBES REVISAR ANTES DE USAR:
 *  1. El import de `createClient` abajo asume un cliente de Supabase para
 *     BROWSER en '@/lib/supabase-browser'. Si tu archivo se llama distinto,
 *     ajusta la ruta.
 *  2. Los valores del enum `estado_orden` (recepcion, diagnostico, etc.)
 *     los inferí de tus tabs. Verifica que coincidan exactamente con los
 *     valores reales en tu base (SELECT unnest(enum_range(NULL::estado_orden)))
 *  3. `origen_tipo` en autorizaciones/historial_estados/repuestos_solicitados
 *     es un enum. Ajusta el valor 'orden_servicio' más abajo si en tu BD
 *     se llama distinto (ej: 'orden').
 *  4. Los valores de `usuarios.rol` usados en ROLES_QUE_PUEDEN_SOLICITAR
 *     ("tecnico", "supervisor") deben coincidir exactamente con el enum
 *     rol_usuario de tu base (SELECT unnest(enum_range(NULL::rol_usuario))).
 * ---------------------------------------------------------------
 */

import { useEffect, useState, useCallback, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import NuevaOrdenModal from "./nueva/NuevaOrdenModal";
import DiagnosticoPanel from "./DiagnosticoPanel";
import { Eye, X } from "lucide-react";
import Link from "next/link";

const supabase = createClient();

// -----------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------

type TabKey =
  | "todas"
  | "recepcion"
  | "diagnostico"
  | "en_reparacion"
  | "listas"
  | "entregadas"
  | "rechazadas";

const TABS: { key: TabKey; label: string; estados: string[] }[] = [
  { key: "todas", label: "Todas", estados: [] },
  { key: "recepcion", label: "Recepción", estados: ["recepcion"] },
  { key: "diagnostico", label: "Diagnóstico", estados: ["diagnostico"] },
  { key: "en_reparacion", label: "Reparación", estados: ["en_reparacion"] },
  { key: "listas", label: "Listas", estados: ["lista_para_entrega"] },
  { key: "entregadas", label: "Entregadas", estados: ["entregada"] },
  {
    key: "rechazadas",
    label: "Rechazadas",
    estados: ["rechazada_por_cliente"],
  },
];

const ESTADO_STYLES: Record<string, string> = {
  recepcion: "bg-orange-50 text-orange-600",
  esperando_pago_diagnostico: "bg-yellow-50 text-yellow-700",
  diagnostico: "bg-purple-50 text-purple-600",
  esperando_autorizacion_jefe: "bg-amber-50 text-amber-700",
  esperando_autorizacion_cliente: "bg-indigo-50 text-indigo-600",
  esperando_repuestos: "bg-pink-50 text-pink-600",
  en_reparacion: "bg-orange-50 text-orange-600",
  lista_para_entrega: "bg-blue-50 text-blue-600",
  no_reparada: "bg-gray-100 text-gray-600",
  rechazada_por_cliente: "bg-red-50 text-red-600",
  entregada: "bg-green-50 text-green-600",
};

const ESTADO_LABELS: Record<string, string> = {
  recepcion: "Recepción",
  esperando_pago_diagnostico: "Esperando Pago Diagnóstico",
  diagnostico: "Diagnóstico",
  esperando_autorizacion_jefe: "Esperando Autorización Jefe",
  esperando_autorizacion_cliente: "Esperando Autorización Cliente",
  esperando_repuestos: "Esperando Repuestos",
  en_reparacion: "En Reparación",
  lista_para_entrega: "Lista para Entrega",
  no_reparada: "No Reparada",
  rechazada_por_cliente: "Rechazada por Cliente",
  entregada: "Entregada",
};

// Para estados que no estén en los mapas de arriba (⚠️ agrega los que falten
// a medida que aparezcan), este fallback al menos los muestra legibles en
// vez del valor crudo del enum ("no_reparada" -> "No reparada").
function formatEstadoFallback(estado: string) {
  return estado
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// -----------------------------------------------------------------------
// Roles y permisos para solicitar repuestos
// -----------------------------------------------------------------------

type Rol = "admin" | "tecnico" | "supervisor" | string;

const ROLES_QUE_PUEDEN_SOLICITAR: Rol[] = ["tecnico", "supervisor"];

// -----------------------------------------------------------------------
// Estado de repuestos (distinto del estado de la orden)
// -----------------------------------------------------------------------

type EstadoRepuesto = "pendiente" | "autorizado" | "rechazado" | "comprado";

const ESTADO_REPUESTO_STYLES: Record<EstadoRepuesto, string> = {
  pendiente: "bg-amber-50 text-amber-700 ring-amber-600/20",
  autorizado: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rechazado: "bg-rose-50 text-rose-700 ring-rose-600/20",
  comprado: "bg-blue-50 text-blue-700 ring-blue-600/20",
};

const ESTADO_REPUESTO_LABELS: Record<EstadoRepuesto, string> = {
  pendiente: "Pendiente",
  autorizado: "Autorizado",
  rechazado: "Rechazado",
  comprado: "Comprado",
};

function EstadoRepuestoBadge({ estado }: { estado: EstadoRepuesto }) {
  const style =
    ESTADO_REPUESTO_STYLES[estado] ?? "bg-gray-100 text-gray-600 ring-gray-200";
  const label = ESTADO_REPUESTO_LABELS[estado] ?? formatEstadoFallback(estado);

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}

interface OrdenListItem {
  id: string;
  numero_orden: string;
  estado: string;
  created_at: string;
  descripcion_problema: string | null;
  cliente: { nombre_razon_social: string } | null;
  maquina: { nombre: string; modelo: string | null } | null;
  tecnico: { nombre: string } | null;
}

interface OrdenDetalle {
  id: string;
  numero_orden: string;
  estado: string;
  created_at: string;
  updated_at: string;
  descripcion_problema: string | null;
  numero_boleta: string | null;
  diagnostico: string | null;
  garantia_ingreso: boolean | null;
  garantia_cubre_dano: boolean | null;
  razon_no_cubre: string | null;
  foto_dano_url: string | null;
  informe_no_reparada: string | null;
  cliente: {
    nombre_razon_social: string;
    rut: string;
    telefono: string | null;
    correo: string | null;
    direccion: string | null;
  } | null;
  maquina: {
    id: string;
    nombre: string;
    marca: string | null;
    modelo: string | null;
    numero_serie: string | null;
    tipo: string;
  } | null;
  tecnico: { nombre: string; telefono: string | null } | null;
  reparacion_autorizada_por: string | null;
  reparacion_autorizada_en: string | null;
  reparacion_autorizacion_motivo: string | null;
}

interface HistorialItem {
  id: string;
  estado_anterior: string | null;
  estado_nuevo: string;
  created_at: string;
  usuario: { nombre: string } | null;
}

interface RepuestoItem {
  id: string;
  nombre_repuesto: string;
  valor: number;
  cantidad: number;
  estado: string;
  created_at: string;
  garantia_cubre_repuesto: boolean;

  recibido: boolean;
  recibido_en: string | null;
  recibido_por: string | null;

  motivo_autorizacion: string | null;
  motivo_rechazo: string | null;

  autorizado_por: string | null;
  autorizado_en: string | null;
  rechazado_por: string | null;
  rechazado_en: string | null;

  autorizado_por_usuario?: {
    nombre: string;
  } | null;

  rechazado_por_usuario?: {
    nombre: string;
  } | null;

  recibido_por_usuario?: {
    nombre: string;
  } | null;
}

interface PagoItem {
  id: string;
  tipo: string;
  numero_boleta: string;
  fecha_pago: string;
  monto: number | null;
}

// -----------------------------------------------------------------------
// Badge de estado (orden)
// -----------------------------------------------------------------------

function EstadoBadge({ estado }: { estado: string }) {
  const style = ESTADO_STYLES[estado] ?? "bg-gray-100 text-gray-600";
  const label = ESTADO_LABELS[estado] ?? formatEstadoFallback(estado);
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
export default function OrdenesServicioView() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-gray-200 bg-white px-4">
          <div className="flex items-center justify-center px-4 py-16 text-sm text-gray-400">
            Cargando órdenes...
          </div>
        </div>
      }
    >
      <OrdenesServicioContent />
    </Suspense>
  );
}

function OrdenesServicioContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabKey>("todas");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [ordenes, setOrdenes] = useState<OrdenListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedOrdenId = searchParams.get("orden");

  const [openNuevaOrden, setOpenNuevaOrden] = useState(false);

  // ---------------------------------------------------------------------
  // ROL DEL USUARIO ACTUAL
  //
  // Se resuelve una sola vez acá arriba y se pasa al drawer, para no
  // volver a consultarlo cada vez que se abre una orden distinta.
  // ---------------------------------------------------------------------

  const [rol, setRol] = useState<Rol | null>(null);
  const [checkingRol, setCheckingRol] = useState(true);

  useEffect(() => {
    async function checkRol() {
      setCheckingRol(true);

      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        setRol(null);
        setCheckingRol(false);
        return;
      }

      const { data: usuario, error: usuarioError } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", auth.user.id)
        .single();

      if (usuarioError) {
        console.error("Error obteniendo rol:", usuarioError);
        setRol(null);
        setCheckingRol(false);
        return;
      }

      setRol(usuario?.rol ?? null);
      setCheckingRol(false);
    }

    checkRol();
  }, []);

  function selectOrden(ordenId: string | null, replace = false) {
    const params = new URLSearchParams(searchParams.toString());

    if (ordenId) {
      params.set("orden", ordenId);

      // Al abrir una orden nueva, comenzar siempre en Resumen.
      params.set("tab", "resumen");
    } else {
      params.delete("orden");
      params.delete("tab");
    }

    const url = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
    const navigate = replace ? router.replace : router.push;

    navigate(url, { scroll: false });
  }

  const fetchOrdenes = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("ordenes_servicio")
      .select(
        `
      id,
      numero_orden,
      estado,
      created_at,
      descripcion_problema,
      cliente:clientes (
        nombre_razon_social
      ),
      maquina:maquinas (
        nombre,
        modelo
      ),
      tecnico:usuarios!ordenes_servicio_tecnico_id_fkey (
        nombre
      )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    const activeTab = TABS.find((t) => t.key === tab);

    if (activeTab && activeTab.estados.length > 0) {
      query = query.in("estado", activeTab.estados);
    }

    if (search) {
      query = query.ilike("numero_orden", `%${search}%`);
    }

    const {
      data,
      count,
      error: queryError,
    } = await query.range((page - 1) * pageSize, page * pageSize - 1);

    if (queryError) {
      console.error("Error cargando órdenes:", queryError);
      setError(queryError.message);
      setOrdenes([]);
      setTotal(0);
    } else {
      setOrdenes((data as unknown as OrdenListItem[]) ?? []);
      setTotal(count ?? 0);
    }

    setLoading(false);
  }, [tab, search, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchOrdenes();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchOrdenes]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="rounded-xl px-4 border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h2 className="text-base font-bold text-gray-900">
          Órdenes de Servicio
        </h2>
        <button
          onClick={() => setOpenNuevaOrden(true)}
          className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-700"
        >
          + Nueva Orden
        </button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
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
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por N° de orden..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
                setPage(1);
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
              <th className="px-4 py-2 font-medium">N° Orden</th>
              <th className="px-4 py-2 font-medium">Fecha Ingreso</th>
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium">Máquina</th>
              <th className="px-4 py-2 font-medium">Etapa</th>
              <th className="px-4 py-2 font-medium">Técnico</th>
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
                  Cargando órdenes...
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-red-500">
                  Error al cargar órdenes: {error}
                </td>
              </tr>
            )}

            {!loading && !error && ordenes.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  No hay órdenes que coincidan con este filtro.
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              ordenes.map((orden) => (
                <tr
                  key={orden.id}
                  onClick={() => selectOrden(orden.id)}
                  className="group cursor-pointer transition-colors duration-150 hover:bg-blue-50 active:bg-orange-50"
                >
                  <td className="px-4 py-1.5 font-semibold text-gray-900 transition-colors group-hover:text-orange-600">
                    {orden.numero_orden}
                  </td>
                  <td className="px-4 py-1.5 text-gray-500">
                    {new Date(orden.created_at).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-4 py-1.5 text-gray-700">
                    {orden.cliente?.nombre_razon_social ?? "—"}
                  </td>
                  <td className="px-4 py-1.5">
                    <div className="leading-tight text-gray-700">
                      {orden.maquina?.nombre ?? "—"}
                    </div>
                    {orden.maquina?.modelo && (
                      <div className="text-[10px] leading-tight text-gray-400">
                        {orden.maquina.modelo}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-1.5">
                    <EstadoBadge estado={orden.estado} />
                  </td>
                  <td className="px-4 py-1.5 text-gray-700">
                    {orden.tecnico?.nombre ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-300 transition-colors group-hover:text-orange-500">
                    ›
                  </td>
                </tr>
              ))}
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
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹
          </button>
          <span className="px-2">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>

      {selectedOrdenId && (
        <OrdenDrawer
          ordenId={selectedOrdenId}
          onClose={() => selectOrden(null, true)}
          rol={rol}
          checkingRol={checkingRol}
        />
      )}

      <NuevaOrdenModal
        open={openNuevaOrden}
        onClose={() => setOpenNuevaOrden(false)}
        onCreated={fetchOrdenes}
      />
    </div>
  );
}

// -----------------------------------------------------------------------
// Drawer de detalle
// -----------------------------------------------------------------------

type DrawerTab =
  | "resumen"
  | "diagnostico"
  | "repuestos"
  | "pagos"
  | "historial";

function OrdenDrawer({
  ordenId,
  onClose,
  rol,
  checkingRol,
}: {
  ordenId: string;
  onClose: () => void;
  rol: Rol | null;
  checkingRol: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");

  const activeTab: DrawerTab =
    tabParam === "resumen" ||
    tabParam === "diagnostico" ||
    tabParam === "repuestos" ||
    tabParam === "pagos" ||
    tabParam === "historial"
      ? tabParam
      : "resumen";
  const [orden, setOrden] = useState<OrdenDetalle | null>(null);
  const [loading, setLoading] = useState(true);

  const [historial, setHistorial] = useState<HistorialItem[] | null>(null);
  const [repuestos, setRepuestos] = useState<RepuestoItem[] | null>(null);
  const [pagos, setPagos] = useState<PagoItem[] | null>(null);

  const [motivoModal, setMotivoModal] = useState<{
    tipo: "autorizado" | "rechazado";
    motivo: string;
    repuestoNombre: string;
  } | null>(null);

  const [autorizarReparacionModal, setAutorizarReparacionModal] =
    useState(false);

  const [emailAdmin, setEmailAdmin] = useState("");
  const [passwordAdmin, setPasswordAdmin] = useState("");
  const [motivoReparacion, setMotivoReparacion] = useState("");

  const [autorizandoReparacion, setAutorizandoReparacion] = useState(false);
  const [errorAutorizacionReparacion, setErrorAutorizacionReparacion] =
    useState<string | null>(null);

  function abrirAutorizacionReparacion() {
    setEmailAdmin("");
    setPasswordAdmin("");
    setMotivoReparacion("");
    setErrorAutorizacionReparacion(null);
    setAutorizarReparacionModal(true);
  }

  const puedeSolicitarRepuestos =
    rol !== null && ROLES_QUE_PUEDEN_SOLICITAR.includes(rol);

  async function confirmarPasoAReparacion(e: React.FormEvent) {
    e.preventDefault();

    setErrorAutorizacionReparacion(null);

    if (!emailAdmin.trim()) {
      setErrorAutorizacionReparacion("Ingresa el correo del administrador.");
      return;
    }

    if (!passwordAdmin) {
      setErrorAutorizacionReparacion(
        "Ingresa la contraseña del administrador.",
      );
      return;
    }

    if (!motivoReparacion.trim()) {
      setErrorAutorizacionReparacion(
        "Debes indicar el motivo para iniciar la reparación.",
      );
      return;
    }

    setAutorizandoReparacion(true);

    try {
      const response = await fetch("/ordenes/autorizar-reparacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ordenId: ordenId,
          email: emailAdmin.trim(),
          password: passwordAdmin,
          motivo: motivoReparacion.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ?? "No se pudo autorizar el inicio de la reparación.",
        );
      }

      setAutorizarReparacionModal(false);

      setOrden((prev) =>
        prev
          ? {
              ...prev,
              estado: "en_reparacion",
            }
          : prev,
      );

      // Recargar historial para que aparezca la autorización.
      setHistorial(null);
    } catch (err) {
      console.error("Error autorizando reparación:", err);

      setErrorAutorizacionReparacion(
        err instanceof Error
          ? err.message
          : "No se pudo autorizar el inicio de la reparación.",
      );
    } finally {
      setAutorizandoReparacion(false);
    }
  }

  // -----------------------------------------------------------------
  // FORMULARIO: solicitar repuesto
  // -----------------------------------------------------------------

  interface RepuestoFormItem {
    id: string;
    nombre: string;
    cantidad: string;
    valor: string;
    garantia_cubre_repuesto: boolean;
  }

  const [repuestosForm, setRepuestosForm] = useState<RepuestoFormItem[]>([
    {
      id: crypto.randomUUID(),
      nombre: "",
      cantidad: "1",
      valor: "",
      garantia_cubre_repuesto: false,
    },
  ]);

  const [submittingRepuesto, setSubmittingRepuesto] = useState(false);

  const [formErrorRepuesto, setFormErrorRepuesto] = useState<string | null>(
    null,
  );

  const [formSuccessRepuesto, setFormSuccessRepuesto] = useState<string | null>(
    null,
  );

  // Detalle principal de la orden
  useEffect(() => {
    let cancelled = false;

    async function fetchDetalle() {
      setLoading(true);
      const { data, error } = await supabase
        .from("ordenes_servicio")
        .select(
          `
  id,
  numero_orden,
  estado,
  created_at,
  updated_at,
  descripcion_problema,
  numero_boleta,
  diagnostico,
  garantia_ingreso,
  garantia_cubre_dano,
  razon_no_cubre,
  foto_dano_url,
  informe_no_reparada,
  cliente:clientes (
    nombre_razon_social,
    rut,
    telefono,
    correo,
    direccion
  ),
  maquina:maquinas (
    id,
    nombre,
    marca,
    modelo,
    numero_serie,
    tipo
  ),
  tecnico:usuarios!ordenes_servicio_tecnico_id_fkey (
    nombre,
    telefono
  ),
  reparacion_autorizada_por,
  reparacion_autorizada_en,
  reparacion_autorizacion_motivo
  `,
        )
        .eq("id", ordenId)
        .single();

      if (!cancelled) {
        if (error) {
          console.error(error.message);
          setOrden(null);
        } else {
          setOrden(data as unknown as OrdenDetalle);
        }
        setLoading(false);
      }
    }

    fetchDetalle();
    return () => {
      cancelled = true;
    };
  }, [ordenId]);

  // Recarga la lista de repuestos de esta orden (se usa tanto en la carga
  // perezosa por tab como después de agregar uno nuevo desde el formulario).
  const loadRepuestos = useCallback(async () => {
    const { data, error } = await supabase
      .from("repuestos_solicitados")
      .select(
        `
  id,
  nombre_repuesto,
  valor,
  cantidad,
  estado,
  garantia_cubre_repuesto,
  created_at,

  recibido,
  recibido_en,
  recibido_por,

  motivo_autorizacion,
  motivo_rechazo,

  autorizado_por,
  autorizado_en,
  rechazado_por,
  rechazado_en,

  autorizado_por_usuario:usuarios!repuestos_solicitados_autorizado_por_fkey (
    nombre
  ),

  rechazado_por_usuario:usuarios!repuestos_solicitados_rechazado_por_fkey (
    nombre
  ),

  recibido_por_usuario:usuarios!repuestos_solicitados_recibido_por_fkey (
    nombre
  )
`,
      )
      .eq("origen_tipo", "orden_servicio")
      .eq("origen_id", ordenId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando repuestos:", error);
      return;
    }

    setRepuestos((data as unknown as RepuestoItem[]) ?? []);
  }, [ordenId]);

  const repuestosActivos =
    repuestos?.filter((r) => r.estado !== "rechazado") ?? [];

  const repuestosRecibidos = repuestosActivos.filter((r) => r.recibido).length;

  const totalRepuestos = repuestosActivos.length;

  // Datos relacionados, cargados perezosamente por tab
  useEffect(() => {
    let cancelled = false;

    async function fetchRelacionados() {
      if (activeTab === "historial" && historial === null) {
        const { data } = await supabase
          .from("historial_estados")
          .select(
            "id, estado_anterior, estado_nuevo, created_at, usuario:usuarios(nombre)",
          )
          .eq("origen_tipo", "orden_servicio") // ⚠️ ajusta al valor real del enum
          .eq("origen_id", ordenId)
          .order("created_at", { ascending: true });
        if (!cancelled)
          setHistorial((data as unknown as HistorialItem[]) ?? []);
      }

      if (activeTab === "repuestos" && repuestos === null) {
        await loadRepuestos();
      }

      if (activeTab === "pagos" && pagos === null) {
        const { data } = await supabase
          .from("pagos")
          .select("id, tipo, numero_boleta, fecha_pago, monto")
          .eq("orden_id", ordenId)
          .order("fecha_pago", { ascending: false });
        if (!cancelled) setPagos((data as unknown as PagoItem[]) ?? []);
      }
    }

    fetchRelacionados();
    return () => {
      cancelled = true;
    };
  }, [activeTab, ordenId, historial, repuestos, pagos, loadRepuestos]);

  function agregarLineaRepuesto() {
    setRepuestosForm((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nombre: "",
        cantidad: "1",
        valor: "",
        garantia_cubre_repuesto: false,
      },
    ]);
  }

  function eliminarLineaRepuesto(id: string) {
    setRepuestosForm((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }

  function actualizarLineaRepuesto(
    id: string,
    campo: keyof Omit<RepuestoFormItem, "id">,
    valor: string | boolean,
  ) {
    setRepuestosForm((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [campo]: valor,
            }
          : item,
      ),
    );
  }

  // -----------------------------------------------------------------
  // CREAR SOLICITUD DE REPUESTO
  // -----------------------------------------------------------------

  async function handleAgregarRepuesto(e: React.FormEvent) {
    e.preventDefault();

    setFormErrorRepuesto(null);
    setFormSuccessRepuesto(null);

    if (!puedeSolicitarRepuestos) {
      setFormErrorRepuesto("No tienes permiso para solicitar repuestos.");
      return;
    }

    if (!orden) {
      setFormErrorRepuesto("No se pudo obtener la información de la orden.");
      return;
    }

    // ---------------------------------------------------------------
    // VALIDAR TODAS LAS LÍNEAS
    // ---------------------------------------------------------------

    const lineasValidas = repuestosForm.map((item) => ({
      ...item,
      nombre: item.nombre.trim(),
      cantidadNum: Number(item.cantidad),
      valorNum: Number(item.valor || 0),
    }));

    const lineaVacia = lineasValidas.find((item) => !item.nombre);

    if (lineaVacia) {
      setFormErrorRepuesto("Todos los repuestos deben tener un nombre.");
      return;
    }

    const cantidadInvalida = lineasValidas.find(
      (item) => !Number.isFinite(item.cantidadNum) || item.cantidadNum <= 0,
    );

    if (cantidadInvalida) {
      setFormErrorRepuesto(
        "La cantidad debe ser mayor a 0 en todos los repuestos.",
      );
      return;
    }

    const valorInvalido = lineasValidas.find(
      (item) => !Number.isFinite(item.valorNum) || item.valorNum < 0,
    );

    if (valorInvalido) {
      setFormErrorRepuesto(
        "El valor estimado no es válido en uno de los repuestos.",
      );
      return;
    }

    setSubmittingRepuesto(true);

    try {
      // -------------------------------------------------------------
      // USUARIO ACTUAL
      // -------------------------------------------------------------

      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error("No se pudo identificar al usuario actual.");
      }

      // -------------------------------------------------------------
      // PREPARAR LOS DATOS
      // -------------------------------------------------------------

      const repuestosParaInsertar = lineasValidas.map((item) => ({
        origen_tipo: "orden_servicio",
        origen_id: ordenId,
        maquina_id: orden.maquina?.id ?? null,
        nombre_repuesto: item.nombre,
        cantidad: item.cantidadNum,
        valor: item.valorNum,
        garantia_cubre_repuesto: item.garantia_cubre_repuesto,
        estado: "pendiente",
        solicitado_por: auth.user.id,
      }));

      // -------------------------------------------------------------
      // INSERTAR TODOS LOS REPUESTOS
      // -------------------------------------------------------------
      //
      // ⚠️ IMPORTANTE: `repuestosInsertados` es la ÚNICA fuente confiable
      // de `id` para lo que sigue. Los `id` de `repuestosForm` /
      // `lineasValidas` son UUIDs generados en el navegador (crypto.randomUUID())
      // solo para el `key` de React — nunca deben usarse para construir
      // enlaces ni para nada que dependa del id real en la base de datos.

      const { data: repuestosInsertados, error: insertError } = await supabase
        .from("repuestos_solicitados")
        .insert(repuestosParaInsertar)
        .select("id, nombre_repuesto, valor, cantidad, estado, created_at");

      if (insertError) {
        throw insertError;
      }

      if (!repuestosInsertados || repuestosInsertados.length === 0) {
        throw new Error(
          "Los repuestos no se pudieron confirmar en la base de datos.",
        );
      }

      // -------------------------------------------------------------
      // CALCULAR TOTAL
      // -------------------------------------------------------------

      const totalEstimado = repuestosInsertados.reduce(
        (total, item) => total + item.cantidad * Number(item.valor),
        0,
      );

      // -------------------------------------------------------------
      // ENVIAR CORREO
      // -------------------------------------------------------------
      // Usa SIEMPRE repuestosInsertados (ids reales de Supabase), nunca
      // lineasValidas / repuestosForm.

      const response = await fetch("/repuestos/solicitud", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ordenId: orden.id,
          repuestos: repuestosInsertados.map((item) => ({
            id: item.id,
            nombre: item.nombre_repuesto,
            cantidad: item.cantidad,
            valor: Number(item.valor),
            subtotal: item.cantidad * Number(item.valor),
          })),
          totalEstimado,
        }),
      });

      const responseText = await response.text();

      console.log("Respuesta de /api/repuestos/solicitud:", responseText);

      let emailResult;

      try {
        emailResult = JSON.parse(responseText);
      } catch {
        console.error("La API no devolvió JSON:", responseText);

        throw new Error(
          "Los repuestos se guardaron, pero la API de correo devolvió una respuesta inválida.",
        );
      }

      if (!response.ok) {
        console.error(
          "Los repuestos fueron guardados, pero falló el correo:",
          emailResult,
        );

        setFormSuccessRepuesto(
          "Los repuestos fueron registrados, pero no se pudo enviar la notificación por correo.",
        );
      } else {
        setFormSuccessRepuesto(
          `Solicitud confirmada con ${repuestosInsertados.length} repuesto(s).`,
        );
      }

      // -------------------------------------------------------------
      // LIMPIAR FORMULARIO
      // -------------------------------------------------------------

      setRepuestosForm([
        {
          id: crypto.randomUUID(),
          nombre: "",
          cantidad: "1",
          valor: "",
          garantia_cubre_repuesto: false,
        },
      ]);

      // -------------------------------------------------------------
      // RECARGAR LISTA
      // -------------------------------------------------------------

      await loadRepuestos();
    } catch (err) {
      console.error("Error creando solicitud de repuestos:", err);

      setFormErrorRepuesto(
        err instanceof Error
          ? err.message
          : "No se pudo registrar la solicitud de repuestos.",
      );
    } finally {
      setSubmittingRepuesto(false);
    }
  }

  const drawerTabs: { key: DrawerTab; label: string }[] = [
    { key: "resumen", label: "Resumen" },
    { key: "diagnostico", label: "Diagnóstico" },
    { key: "repuestos", label: "Repuestos" },
    { key: "pagos", label: "Pagos" },
    { key: "historial", label: "Historial" },
  ];

  return (
    <>
      {motivoModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[2px]"
          onClick={() => setMotivoModal(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
                    motivoModal.tipo === "autorizado"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-rose-600"
                  }`}
                >
                  <Eye className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-gray-900">
                    {motivoModal.tipo === "autorizado"
                      ? "Motivo de autorización"
                      : "Motivo del rechazo"}
                  </h3>

                  <p className="truncate text-[10px] text-gray-400">
                    {motivoModal.repuestoNombre}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMotivoModal(null)}
                className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-4">
              <div
                className={`rounded-lg border p-3 ${
                  motivoModal.tipo === "autorizado"
                    ? "border-emerald-100 bg-emerald-50/50"
                    : "border-rose-100 bg-rose-50/50"
                }`}
              >
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
                  {motivoModal.motivo}
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setMotivoModal(null)}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {autorizarReparacionModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
          onClick={() => {
            if (!autorizandoReparacion) {
              setAutorizarReparacionModal(false);
            }
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                  🔒
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Autorizar inicio de reparación
                  </h3>

                  <p className="mt-0.5 text-xs text-gray-500">
                    Requiere autorización de administrador
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={confirmarPasoAReparacion}
              className="space-y-4 px-5 py-5"
            >
              <div className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2.5">
                <p className="text-xs text-orange-800">
                  Esta acción cambiará la orden{" "}
                  <span className="font-semibold">{orden?.numero_orden}</span>{" "}
                  de <strong>Esperando Repuestos</strong> a{" "}
                  <strong>En Reparación</strong>.
                </p>

                <p className="mt-1 text-[11px] text-orange-700">
                  Repuestos recibidos:{" "}
                  <strong>
                    {repuestosRecibidos} de {totalRepuestos}
                  </strong>
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Correo del administrador
                </label>

                <input
                  type="email"
                  value={emailAdmin}
                  onChange={(e) => setEmailAdmin(e.target.value)}
                  placeholder="admin@empresa.cl"
                  autoComplete="username"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Contraseña
                </label>

                <input
                  type="password"
                  value={passwordAdmin}
                  onChange={(e) => setPasswordAdmin(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Motivo
                </label>

                <textarea
                  value={motivoReparacion}
                  onChange={(e) => setMotivoReparacion(e.target.value)}
                  rows={3}
                  placeholder="Ej: Se autoriza iniciar la reparación con los repuestos disponibles."
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {errorAutorizacionReparacion && (
                <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
                  {errorAutorizacionReparacion}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={autorizandoReparacion}
                  onClick={() => setAutorizarReparacionModal(false)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-gray-600 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={autorizandoReparacion}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {autorizandoReparacion
                    ? "Autorizando..."
                    : "Confirmar y pasar a reparación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl sm:max-w-lg lg:max-w-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4">
          <div className="min-w-0">
            <div className="text-xs text-gray-400">Orden de Servicio</div>
            <div className="truncate text-lg font-semibold text-gray-900">
              {orden?.numero_orden ?? "..."}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {orden && <EstadoBadge estado={orden.estado} />}
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        <div
          className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-4 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {drawerTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());

                params.set("tab", t.key);

                router.replace(`${pathname}?${params.toString()}`, {
                  scroll: false,
                });
              }}
              className={`flex-shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? "border-orange-600 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <p className="text-sm text-gray-400">Cargando detalle...</p>
          )}

          {!loading && orden && activeTab === "resumen" && (
            <div className="space-y-6">
              <section>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Información General
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm lg:grid-cols-3">
                  <div>
                    <div className="text-gray-400">Cliente</div>
                    <div className="font-medium text-gray-900">
                      {orden.cliente?.nombre_razon_social ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Teléfono</div>
                    <div className="font-medium text-gray-900">
                      {orden.cliente?.telefono ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Máquina</div>
                    <div className="font-medium text-gray-900">
                      {orden.maquina?.nombre ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Modelo</div>
                    <div className="font-medium text-gray-900">
                      {orden.maquina?.modelo ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">N° Serie</div>
                    <div className="font-medium text-gray-900">
                      {orden.maquina?.numero_serie ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Fecha Ingreso</div>
                    <div className="font-medium text-gray-900">
                      {new Date(orden.created_at).toLocaleString("es-CL")}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Etapa actual</div>
                    <div className="mt-1">
                      <EstadoBadge estado={orden.estado} />
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Técnico Asignado</div>
                    <div className="font-medium text-gray-900">
                      {orden.tecnico?.nombre ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Garantía</div>
                    <div className="font-medium text-gray-900">
                      {orden.garantia_ingreso === true
                        ? "Con garantía"
                        : orden.garantia_ingreso === false
                          ? "Sin garantía"
                          : "—"}
                    </div>
                  </div>
                </div>

                {/*
                  Aviso: la máquina ENTRÓ con garantía, pero el técnico
                  determinó en el diagnóstico que este daño puntual no
                  está cubierto. No reemplaza el campo "Garantía" de
                  arriba (que sigue reflejando cómo entró la máquina),
                  solo agrega contexto adicional del diagnóstico.
                */}
                {orden.garantia_ingreso === true &&
                  orden.garantia_cubre_dano === false && (
                    <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 ring-1 ring-inset ring-rose-600/20">
                      <p className="text-xs font-semibold text-rose-600">
                        Garantía no cubre este daño
                      </p>
                      <p className="text-xs text-rose-500 leading-relaxed">
                        {orden.razon_no_cubre ??
                          "El técnico no especificó el motivo."}
                      </p>
                    </div>
                  )}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  Descripción del Problema
                </h3>
                <p className="text-sm text-gray-600">
                  {orden.descripcion_problema ?? "Sin descripción registrada."}
                </p>
              </section>
            </div>
          )}

          {!loading && orden && activeTab === "diagnostico" && (
            <div className="space-y-6">
              <DiagnosticoPanel
                ordenId={orden.id}
                onUpdated={(patch) =>
                  setOrden((prev) =>
                    prev
                      ? {
                          ...prev,
                          estado: patch.estado,
                          diagnostico: patch.diagnostico,
                        }
                      : prev,
                  )
                }
              />

              {orden.razon_no_cubre && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">
                    Razón no cubre
                  </h3>
                  <p className="text-sm text-gray-600">
                    {orden.razon_no_cubre}
                  </p>
                </section>
              )}
              {orden.informe_no_reparada && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">
                    Informe (no reparada)
                  </h3>
                  <p className="text-sm text-gray-600">
                    {orden.informe_no_reparada}
                  </p>
                </section>
              )}
              {orden.foto_dano_url && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">
                    Foto del daño
                  </h3>
                  <img
                    src={orden.foto_dano_url}
                    alt="Foto del daño"
                    className="rounded-lg border border-gray-200"
                  />
                </section>
              )}
            </div>
          )}

          {activeTab === "repuestos" && (
            <div className="space-y-4">
              {orden?.estado === "esperando_repuestos" && (
                <section className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-orange-900">
                        Repuestos disponibles
                      </h3>

                      <p className="mt-1 text-xs leading-relaxed text-orange-700">
                        {totalRepuestos === 0
                          ? "No hay repuestos registrados para esta orden."
                          : `${repuestosRecibidos} de ${totalRepuestos} repuesto(s) requerido(s) recibido(s).`}
                      </p>

                      <p className="mt-1 text-[11px] text-orange-600">
                        El administrador puede autorizar el inicio de la
                        reparación aunque existan repuestos pendientes.
                      </p>
                    </div>

                    {/* 👇 AQUÍ VA EL BOTÓN */}
                    {totalRepuestos > 0 &&
                      repuestosRecibidos === totalRepuestos && (
                        <button
                          type="button"
                          onClick={abrirAutorizacionReparacion}
                          disabled={autorizandoReparacion}
                          className="flex-shrink-0 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          🔒 Pasar a reparación
                        </button>
                      )}
                  </div>
                </section>
              )}
              {/* ===========================================================
                  FORMULARIO: solo técnico/supervisor pueden solicitar.
                  La restricción real la da la policy RESTRICTIVE de RLS en
                  repuestos_solicitados; este chequeo es solo UX.
              =========================================================== */}

              {!checkingRol && puedeSolicitarRepuestos && (
                <form
                  onSubmit={handleAgregarRepuesto}
                  className="space-y-4 rounded-lg border border-gray-200 p-4"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Solicitar repuestos
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Agrega todos los repuestos necesarios para esta reparación
                      y luego confirma la solicitud.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {repuestosForm.map((item, index) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">
                            Repuesto {index + 1}
                          </span>

                          {repuestosForm.length > 1 && (
                            <button
                              type="button"
                              onClick={() => eliminarLineaRepuesto(item.id)}
                              className="text-xs font-medium text-rose-500 hover:text-rose-700"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_100px_140px]">
                          <input
                            type="text"
                            placeholder="Nombre del repuesto"
                            value={item.nombre}
                            onChange={(e) =>
                              actualizarLineaRepuesto(
                                item.id,
                                "nombre",
                                e.target.value,
                              )
                            }
                            className="rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          />

                          <input
                            type="number"
                            min={1}
                            step={1}
                            placeholder="Cantidad"
                            value={item.cantidad}
                            onChange={(e) =>
                              actualizarLineaRepuesto(
                                item.id,
                                "cantidad",
                                e.target.value,
                              )
                            }
                            className="rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          />

                          <input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="Valor unitario"
                            value={item.valor}
                            onChange={(e) =>
                              actualizarLineaRepuesto(
                                item.id,
                                "valor",
                                e.target.value,
                              )
                            }
                            className="rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          />
                        </div>

                        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={item.garantia_cubre_repuesto}
                            onChange={(e) =>
                              actualizarLineaRepuesto(
                                item.id,
                                "garantia_cubre_repuesto",
                                e.target.checked,
                              )
                            }
                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />

                          <span>
                            Este repuesto está cubierto por la garantía
                          </span>
                        </label>

                        {item.cantidad &&
                          item.valor &&
                          Number(item.cantidad) > 0 &&
                          Number(item.valor) >= 0 && (
                            <div className="mt-2 text-right text-xs text-gray-500">
                              Subtotal:{" "}
                              <span className="font-semibold text-gray-700">
                                $
                                {(
                                  Number(item.cantidad) * Number(item.valor)
                                ).toLocaleString("es-CL")}
                              </span>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>

                  {/* ---------------------------------------------------------
        AGREGAR OTRA LÍNEA
    --------------------------------------------------------- */}

                  <button
                    type="button"
                    onClick={agregarLineaRepuesto}
                    disabled={submittingRepuesto}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    + Agregar otro repuesto
                  </button>

                  {/* ---------------------------------------------------------
        TOTAL
    --------------------------------------------------------- */}

                  {(() => {
                    const total = repuestosForm.reduce((sum, item) => {
                      const cantidad = Number(item.cantidad) || 0;
                      const valor = Number(item.valor) || 0;

                      return sum + cantidad * valor;
                    }, 0);

                    return (
                      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <span className="text-xs font-medium text-gray-500">
                          Total estimado
                        </span>

                        <span className="text-sm font-bold text-gray-900">
                          ${total.toLocaleString("es-CL")}
                        </span>
                      </div>
                    );
                  })()}

                  {/* ---------------------------------------------------------
        MENSAJES
    --------------------------------------------------------- */}

                  {formErrorRepuesto && (
                    <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600">
                      {formErrorRepuesto}
                    </div>
                  )}

                  {formSuccessRepuesto && (
                    <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      {formSuccessRepuesto}
                    </div>
                  )}

                  {/* ---------------------------------------------------------
        CONFIRMAR
    --------------------------------------------------------- */}

                  <button
                    type="submit"
                    disabled={submittingRepuesto}
                    className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingRepuesto
                      ? "Registrando solicitud..."
                      : "✓ Confirmar solicitud de repuestos"}
                  </button>
                </form>
              )}

              {!checkingRol && !puedeSolicitarRepuestos && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  Solo técnicos o supervisores pueden solicitar repuestos.
                </div>
              )}

              {/* =========================================================
                  LISTA (visible para todos los roles con acceso al drawer)
              ========================================================= */}

              {repuestos?.map((r) => (
                <Link
                  key={r.id}
                  href={`/repuestos?repuestosTab=${r.estado}&repuesto=${r.id}`}
                  className="block rounded-lg border border-gray-200 p-3 text-sm transition hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900">
                        {r.nombre_repuesto}
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                        <span>Cantidad: {r.cantidad}</span>

                        <EstadoRepuestoBadge
                          estado={r.estado as EstadoRepuesto}
                        />

                        {r.estado === "autorizado" && r.autorizado_en && (
                          <span className="text-[10px] text-gray-400">
                            Gestionado por{" "}
                            <span className="font-medium text-gray-600">
                              {r.autorizado_por_usuario?.nombre ??
                                "Usuario desconocido"}
                            </span>
                            {" · "}
                            {new Date(r.autorizado_en).toLocaleString("es-CL", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}

                        {r.estado === "rechazado" && r.rechazado_en && (
                          <span className="text-[10px] text-gray-400">
                            Gestionado por{" "}
                            <span className="font-medium text-gray-600">
                              {r.rechazado_por_usuario?.nombre ??
                                "Usuario desconocido"}
                            </span>
                            {" · "}
                            {new Date(r.rechazado_en).toLocaleString("es-CL", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}

                        {r.estado === "autorizado" && r.motivo_autorizacion && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              setMotivoModal({
                                tipo: "autorizado",
                                motivo: r.motivo_autorizacion!,
                                repuestoNombre: r.nombre_repuesto,
                              });
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                            title="Ver motivo de autorización"
                            aria-label="Ver motivo de autorización"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}

                        {r.estado === "rechazado" && r.motivo_rechazo && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              setMotivoModal({
                                tipo: "rechazado",
                                motivo: r.motivo_rechazo!,
                                repuestoNombre: r.nombre_repuesto,
                              });
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition hover:bg-rose-50 hover:text-rose-600"
                            title="Ver motivo del rechazo"
                            aria-label="Ver motivo del rechazo"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {activeTab === "pagos" && (
            <div className="space-y-2">
              {pagos === null && (
                <p className="text-sm text-gray-400">Cargando pagos...</p>
              )}
              {pagos !== null && pagos.length === 0 && (
                <p className="text-sm text-gray-400">
                  No hay pagos registrados.
                </p>
              )}
              {pagos?.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-10 rounded-lg border border-gray-200 p-3 text-sm"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1)}
                    </div>
                    <div className="text-xs text-gray-400">
                      Boleta N° ${" "}
                      {Number(p.numero_boleta).toLocaleString("es-CL")}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Fecha Pago</div>
                    <div className="text-xs text-gray-400">
                      {new Date(p.fecha_pago).toLocaleDateString("es-CL")}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      Monto
                      <div className="text-xs text-gray-400">
                        ${" "}
                        {p.monto
                          ? Number(p.monto).toLocaleString("es-CL")
                          : "0"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "historial" && (
            <div>
              {historial === null && (
                <p className="text-sm text-gray-400">Cargando historial...</p>
              )}
              {historial !== null && historial.length === 0 && (
                <p className="text-sm text-gray-400">
                  Sin movimientos registrados.
                </p>
              )}

              {historial !== null && historial.length > 0 && (
                <ul className="relative space-y-0">
                  {historial.map((h, i) => {
                    const esUltimo = i === historial.length - 1;

                    return (
                      <li key={h.id} className="relative flex gap-4 pb-6">
                        {/* Línea vertical que conecta los puntos, excepto
                            en el último item de la lista. */}
                        {!esUltimo && (
                          <span
                            aria-hidden="true"
                            className="absolute left-[7px] top-4 h-full w-px bg-gray-200"
                          />
                        )}

                        {/* Punto del timeline */}
                        <span className="relative z-10 mt-1.5 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-orange-600 ring-1 ring-orange-100" />

                        <div className="min-w-0 flex-1 pb-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {h.estado_anterior && (
                              <>
                                <EstadoBadge estado={h.estado_anterior} />
                                <span className="text-xs text-gray-300">→</span>
                              </>
                            )}
                            <EstadoBadge estado={h.estado_nuevo} />
                          </div>

                          <div className="mt-1.5 text-xs text-gray-400">
                            {new Date(h.created_at).toLocaleString("es-CL", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {h.usuario?.nombre && (
                              <>
                                {" · "}
                                <span className="font-medium text-gray-500">
                                  {h.usuario.nombre}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
