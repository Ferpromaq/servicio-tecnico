"use client";

/**
 * RepuestosView
 * ---------------------------------------------------------------
 * Vista consolidada de todos los repuestos solicitados.
 *
 * Funcionalidades:
 *  - Filtros por estado.
 *  - Paginación de 8 registros.
 *  - Todos los usuarios pueden ver quién gestionó un repuesto.
 *  - Solo administradores pueden aprobar o rechazar.
 *  - Resuelve el origen cuando corresponde a una orden de servicio.
 *  - Permite abrir un repuesto específico desde la URL.
 *  - Si el repuesto está en otra página, navega automáticamente
 *    hasta la página correspondiente.
 *  - Hace scroll hasta el repuesto seleccionado.
 *  - Destaca visualmente el repuesto indicado en la URL.
 *  - Cada fila de repuesto es clickeable.
 *  - La selección se mantiene en la URL.
 *  - Permite agregar repuestos del stock de la empresa y
 *    asignarlos (ahora o después) a una orden de servicio.
 * ---------------------------------------------------------------
 */

import { useEffect, useState, useCallback, useRef, Suspense } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Check,
  ShoppingCart,
  PackageCheck,
  Wrench,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Inbox,
  Eye,
  Plus,
  Link2,
} from "lucide-react";

import { createClient } from "@/lib/supabase-browser";
import AutorizacionModal from "./components/AutorizacionModal";
import ConfirmarCompraModal from "./components/ConfirmarCompraModal";
import AgregarRepuestoModal from "./components/AgregarRepuestoModal";
import RepuestoDrawer from "./components/RepuestoDrawer";

const supabase = createClient();

// -----------------------------------------------------------------------
// CONFIGURACIÓN
// -----------------------------------------------------------------------

const PAGE_SIZE = 8;

// -----------------------------------------------------------------------
// TIPOS
// -----------------------------------------------------------------------

type EstadoRepuesto = "pendiente" | "autorizado" | "rechazado" | "comprado";

type TabKey = "todos" | EstadoRepuesto;

interface RepuestoRow {
  id: string;
  origen_tipo: string;
  origen_id: string | null;
  desde_stock: boolean;
  nombre_repuesto: string;
  valor: number;
  cantidad: number;
  estado: EstadoRepuesto;
  created_at: string;

  // Auditoría
  auditoria_requerida: boolean;

  // Máquina y solicitud
  maquina_id: string | null;
  solicitado_por: string | null;

  // Autorización
  autorizado_por: string | null;
  autorizado_en: string | null;
  motivo_autorizacion: string | null;

  // Rechazo
  rechazado_por: string | null;
  rechazado_en: string | null;
  motivo_rechazo: string | null;

  // Compra
  comprado_por: string | null;
  comprado_en: string | null;

  // Garantía / contacto cliente
  garantia_cubre_repuesto: boolean;
  cliente_contactado: boolean;
  cliente_contactado_por: string | null;

  // Recepción
  recibido: boolean;
  recibido_en: string | null;
  recibido_por: string | null;

  // Instalación
  instalado: boolean;
  instalado_en: string | null;
  instalado_por: string | null;
}

interface OrdenRef {
  id: string;
  numero_orden: string;
  cliente: {
    nombre_razon_social: string;
  } | null;
}

interface UsuarioRef {
  id: string;
  nombre: string;
}

interface MaquinaRef {
  id: string;
  tipo: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  estado: string;
}

function getEstadoRepuesto(repuesto: RepuestoRow) {
  if (repuesto.estado === "rechazado") {
    return "Rechazado";
  }

  if (repuesto.instalado) {
    return "Instalado";
  }

  if (repuesto.recibido) {
    return "Recibido";
  }

  if (repuesto.estado === "comprado") {
    return "Comprado";
  }

  if (repuesto.estado === "autorizado") {
    return "Autorizado";
  }

  return "Pendiente";
}

// -----------------------------------------------------------------------
// COLUMNAS A CONSULTAR
// -----------------------------------------------------------------------

const REPUESTO_COLUMNS = `
    id,
    origen_tipo,
    origen_id,
    desde_stock,
    nombre_repuesto,
    valor,
    cantidad,
    estado,
    created_at,

    auditoria_requerida,

    maquina_id,
    solicitado_por,

    autorizado_por,
    autorizado_en,
    motivo_autorizacion,

    rechazado_por,
    rechazado_en,
    motivo_rechazo,

    comprado_por,
    comprado_en,

    garantia_cubre_repuesto,
    cliente_contactado,
    cliente_contactado_por,

    recibido,
    recibido_en,
    recibido_por,

    instalado,
    instalado_en,
    instalado_por
  `;

// -----------------------------------------------------------------------
// TABS
// -----------------------------------------------------------------------

const TABS: { key: TabKey; label: string }[] = [
  {
    key: "todos",
    label: "Todos",
  },
  {
    key: "pendiente",
    label: "Pendientes",
  },
  {
    key: "autorizado",
    label: "Autorizados",
  },
  {
    key: "rechazado",
    label: "Rechazados",
  },
  {
    key: "comprado",
    label: "Comprados",
  },
];

// -----------------------------------------------------------------------
// ESTADOS
// -----------------------------------------------------------------------

const ESTADO_STYLES: Record<EstadoRepuesto, string> = {
  pendiente: "bg-amber-50 text-amber-700 ring-amber-600/20",

  autorizado: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",

  rechazado: "bg-rose-50 text-rose-700 ring-rose-600/20",

  comprado: "bg-blue-50 text-blue-700 ring-blue-600/20",
};

const ESTADO_DOT: Record<EstadoRepuesto, string> = {
  pendiente: "bg-amber-500",
  autorizado: "bg-emerald-500",
  rechazado: "bg-rose-500",
  comprado: "bg-blue-500",
};

const ESTADO_LABELS: Record<EstadoRepuesto, string> = {
  pendiente: "Pendiente",
  autorizado: "Autorizado",
  rechazado: "Rechazado",
  comprado: "Comprado",
};

// -----------------------------------------------------------------------
// COMPONENTE BADGE
// -----------------------------------------------------------------------

function EstadoBadge({ estado }: { estado: EstadoRepuesto }) {
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${ESTADO_STYLES[estado]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_DOT[estado]}`} />

      {ESTADO_LABELS[estado]}
    </span>
  );
}

// -----------------------------------------------------------------------
// AVATAR DE INICIALES
// -----------------------------------------------------------------------

function InitialsAvatar({ nombre }: { nombre: string }) {
  const initials = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
      {initials || "?"}
    </div>
  );
}

// -----------------------------------------------------------------------
// UTILIDADES
// -----------------------------------------------------------------------

function formatCLP(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-CL")}`;
}

function formatFechaHora(fecha: string | null) {
  if (!fecha) return "—";

  return new Date(fecha).toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// -----------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// -----------------------------------------------------------------------

export default function RepuestosView() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-gray-200 bg-white px-4">
          <div className="flex items-center justify-center px-4 py-16 text-sm text-gray-400">
            Cargando repuestos...
          </div>
        </div>
      }
    >
      <RepuestosContent />
    </Suspense>
  );
}

function RepuestosContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ---------------------------------------------------------------------
  // URL
  // ---------------------------------------------------------------------

  const tabParam = searchParams.get("repuestosTab");

  const aprobarParam = searchParams.get("aprobar");

  const rechazarParam = searchParams.get("rechazar");

  const accionParam = searchParams.get("accion");

  const repuestoParam = searchParams.get("repuesto");

  const tab: TabKey =
    tabParam === "todos" ||
    tabParam === "pendiente" ||
    tabParam === "autorizado" ||
    tabParam === "rechazado" ||
    tabParam === "comprado"
      ? tabParam
      : "pendiente";

  // ---------------------------------------------------------------------
  // DATOS
  // ---------------------------------------------------------------------

  const [rows, setRows] = useState<RepuestoRow[]>([]);

  const [ordenesById, setOrdenesById] = useState<Record<string, OrdenRef>>({});

  const [usuariosById, setUsuariosById] = useState<Record<string, UsuarioRef>>(
    {},
  );
  const [maquinasById, setMaquinasById] = useState<Record<string, MaquinaRef>>(
    {},
  );

  // ---------------------------------------------------------------------
  // CARGA
  // ---------------------------------------------------------------------

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------
  // ROL
  // ---------------------------------------------------------------------

  const [isAdmin, setIsAdmin] = useState(false);

  // ---------------------------------------------------------------------
  // PAGINACIÓN
  // ---------------------------------------------------------------------

  const [page, setPage] = useState(1);

  const [totalRows, setTotalRows] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  // ---------------------------------------------------------------------
  // MODALES
  // ---------------------------------------------------------------------

  const [authModal, setAuthModal] = useState<{
    repuesto: RepuestoRow;
    accion: "autorizado" | "rechazado";
  } | null>(null);

  const [compraModal, setCompraModal] = useState<RepuestoRow | null>(null);

  const [motivoModal, setMotivoModal] = useState<{
    tipo: "autorizado" | "rechazado";
    motivo: string;
    repuestoNombre: string;
  } | null>(null);

  const [stockModal, setStockModal] = useState<
    { mode: "crear" } | { mode: "asignar"; repuesto: RepuestoRow } | null
  >(null);

  const [repuestoSeleccionado, setRepuestoSeleccionado] = useState<any>(null);

  // ---------------------------------------------------------------------
  // REFERENCIAS
  // ---------------------------------------------------------------------

  const ignorarModalDesdeUrl = useRef(false);

  const filasRepuestosRef = useRef<Record<string, HTMLTableRowElement | null>>(
    {},
  );

  const paginaBuscadaParaRepuestoRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------
  // COMPROBAR ROL
  // ---------------------------------------------------------------------

  useEffect(() => {
    async function checkRole() {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        setIsAdmin(false);
        return;
      }

      const { data: usuario, error: usuarioError } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", auth.user.id)
        .single();

      if (usuarioError) {
        console.error("Error obteniendo rol:", usuarioError);

        setIsAdmin(false);
        return;
      }

      setIsAdmin(usuario?.rol === "admin");
    }

    checkRole();
  }, []);

  // =====================================================================
  // LOCALIZAR REPUESTO DE LA URL
  // =====================================================================

  useEffect(() => {
    if (!repuestoParam) {
      paginaBuscadaParaRepuestoRef.current = null;

      return;
    }

    if (paginaBuscadaParaRepuestoRef.current === repuestoParam) {
      return;
    }

    let cancelled = false;

    async function localizarRepuesto() {
      try {
        // ---------------------------------------------------------------
        // 1. Obtener el repuesto
        // ---------------------------------------------------------------

        const { data: repuesto, error: repuestoError } = await supabase
          .from("repuestos_solicitados")
          .select("id, estado, created_at")
          .eq("id", repuestoParam)
          .single();

        if (cancelled) return;

        if (repuestoError || !repuesto) {
          console.error(
            "No se pudo localizar el repuesto desde la URL:",
            repuestoError,
          );

          return;
        }

        const estadoRepuesto = repuesto.estado as EstadoRepuesto;

        // ---------------------------------------------------------------
        // 2. Cambiar automáticamente de tab
        // ---------------------------------------------------------------

        if (tab !== "todos" && tab !== estadoRepuesto) {
          paginaBuscadaParaRepuestoRef.current = repuestoParam;

          const params = new URLSearchParams(searchParams.toString());

          params.set("repuestosTab", estadoRepuesto);

          params.set("repuesto", repuestoParam ?? "");

          router.replace(`${pathname}?${params.toString()}`, {
            scroll: false,
          });

          setPage(1);

          return;
        }

        // ---------------------------------------------------------------
        // 3. Contar registros anteriores
        // ---------------------------------------------------------------

        let countQuery = supabase
          .from("repuestos_solicitados")
          .select("id", {
            count: "exact",
            head: true,
          })
          .or(
            `created_at.gt.${repuesto.created_at},and(created_at.eq.${repuesto.created_at},id.gt.${repuesto.id})`,
          );

        if (tab !== "todos") {
          countQuery = countQuery.eq("estado", tab);
        }

        const { count, error: countError } = await countQuery;

        if (cancelled) return;

        if (countError) {
          console.error("Error calculando página del repuesto:", countError);

          return;
        }

        // ---------------------------------------------------------------
        // 4. Calcular página
        // ---------------------------------------------------------------

        const posicion = count ?? 0;

        const paginaObjetivo = Math.floor(posicion / PAGE_SIZE) + 1;

        // ---------------------------------------------------------------
        // 5. Marcar como localizado
        // ---------------------------------------------------------------

        paginaBuscadaParaRepuestoRef.current = repuestoParam;

        // ---------------------------------------------------------------
        // 6. Ir a la página
        // ---------------------------------------------------------------

        setPage(paginaObjetivo);
      } catch (error) {
        console.error("Error localizando repuesto desde la URL:", error);
      }
    }

    localizarRepuesto();

    return () => {
      cancelled = true;
    };
  }, [repuestoParam, tab, pathname, router, searchParams]);

  // =====================================================================
  // CARGAR REPUESTOS
  // =====================================================================

  const fetchRepuestos = useCallback(async () => {
    setLoading(true);
    setError(null);

    // ---------------------------------------------------------------
    // RANGO DE PAGINACIÓN
    // ---------------------------------------------------------------

    const from = (page - 1) * PAGE_SIZE;

    const to = from + PAGE_SIZE - 1;

    // ---------------------------------------------------------------
    // QUERY PRINCIPAL
    // ---------------------------------------------------------------

    let query = supabase
      .from("repuestos_solicitados")
      .select(REPUESTO_COLUMNS, {
        count: "exact",
      })
      .order("created_at", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      })
      .range(from, to);

    // ---------------------------------------------------------------
    // FILTRO
    // ---------------------------------------------------------------

    if (tab !== "todos") {
      query = query.eq("estado", tab);
    }

    const { data, error: queryError, count } = await query;

    // ---------------------------------------------------------------
    // ERROR
    // ---------------------------------------------------------------

    if (queryError) {
      console.error("Error cargando repuestos:", queryError);

      setError(queryError.message);
      setRows([]);
      setTotalRows(0);
      setLoading(false);

      return;
    }

    // ---------------------------------------------------------------
    // GUARDAR RESULTADOS
    // ---------------------------------------------------------------

    const repuestos = (data as unknown as RepuestoRow[]) ?? [];

    setRows(repuestos);
    setTotalRows(count ?? 0);

    // ---------------------------------------------------------------
    // RESOLVER ÓRDENES
    // ---------------------------------------------------------------

    const ordenIds = Array.from(
      new Set(
        repuestos
          .filter((r) => r.origen_tipo === "orden_servicio" && r.origen_id)
          .map((r) => r.origen_id as string),
      ),
    );

    if (ordenIds.length > 0) {
      const { data: ordenes, error: ordenesError } = await supabase
        .from("ordenes_servicio")
        .select(
          `
              id,
              numero_orden,
              cliente:clientes(
                nombre_razon_social
              )
            `,
        )
        .in("id", ordenIds);

      if (ordenesError) {
        console.error("Error cargando órdenes:", ordenesError);
      }

      const map: Record<string, OrdenRef> = {};

      for (const orden of (ordenes as unknown as OrdenRef[]) ?? []) {
        map[orden.id] = orden;
      }

      setOrdenesById(map);
    } else {
      setOrdenesById({});
    }

    // ---------------------------------------------------------------
    // RESOLVER USUARIOS
    // ---------------------------------------------------------------

    const usuarioIds = Array.from(
      new Set(
        repuestos
          .flatMap((r) => [
            r.solicitado_por,
            r.autorizado_por,
            r.rechazado_por,
            r.comprado_por,
            r.recibido_por,
            r.instalado_por,
          ])
          .filter((id): id is string => Boolean(id)),
      ),
    );

    // ---------------------------------------------------------------
    // RESOLVER MÁQUINAS
    // ---------------------------------------------------------------

    const maquinaIds = Array.from(
      new Set(
        repuestos
          .map((r) => r.maquina_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (maquinaIds.length > 0) {
      const { data: maquinas, error: maquinasError } = await supabase
        .from("maquinas")
        .select(
          `
            id,
            tipo,
            nombre,
            marca,
            modelo,
            numero_serie,
            estado
          `,
        )
        .in("id", maquinaIds);

      if (maquinasError) {
        console.error("Error cargando máquinas:", maquinasError);
        setMaquinasById({});
      } else {
        const map: Record<string, MaquinaRef> = {};

        for (const maquina of (maquinas as MaquinaRef[]) ?? []) {
          map[maquina.id] = maquina;
        }

        setMaquinasById(map);
      }
    } else {
      setMaquinasById({});
    }

    if (usuarioIds.length > 0) {
      const { data: usuarios, error: usuariosError } = await supabase
        .from("usuarios")
        .select(
          `
              id,
              nombre
            `,
        )
        .in("id", usuarioIds);

      if (usuariosError) {
        console.error("Error cargando usuarios:", usuariosError);
      }

      const map: Record<string, UsuarioRef> = {};

      for (const usuario of (usuarios as unknown as UsuarioRef[]) ?? []) {
        map[usuario.id] = usuario;
      }

      setUsuariosById(map);
    } else {
      setUsuariosById({});
    }

    setLoading(false);
  }, [page, tab]);

  // =====================================================================
  // EJECUTAR CONSULTA
  // =====================================================================

  useEffect(() => {
    fetchRepuestos();
  }, [fetchRepuestos]);

  // =====================================================================
  // SCROLL AL REPUESTO SELECCIONADO
  // =====================================================================

  useEffect(() => {
    if (!repuestoParam || loading) {
      return;
    }

    const fila = filasRepuestosRef.current[repuestoParam];

    if (!fila) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      fila.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [repuestoParam, loading, rows, page]);

  // =====================================================================
  // ABRIR MODAL DESDE URL
  // =====================================================================

  useEffect(() => {
    const repuestoIdDesdeModal = aprobarParam ?? rechazarParam;

    if (!repuestoIdDesdeModal) {
      ignorarModalDesdeUrl.current = false;

      return;
    }

    if (ignorarModalDesdeUrl.current) {
      return;
    }

    if (!isAdmin) {
      return;
    }

    if (authModal?.repuesto.id === repuestoIdDesdeModal) {
      return;
    }

    let cancelled = false;

    async function cargarRepuestoDesdeUrl() {
      const { data, error } = await supabase
        .from("repuestos_solicitados")
        .select(REPUESTO_COLUMNS)
        .eq("id", repuestoIdDesdeModal)
        .single();

      if (cancelled) return;

      if (error || !data) {
        console.error("Error recuperando repuesto desde la URL:", error);

        return;
      }

      const repuesto = data as unknown as RepuestoRow;

      if (repuesto.estado !== "pendiente" || repuesto.garantia_cubre_repuesto) {
        return;
      }

      const accion: "autorizado" | "rechazado" =
        accionParam === "rechazado" ? "rechazado" : "autorizado";

      setAuthModal({
        repuesto,
        accion,
      });
    }

    cargarRepuestoDesdeUrl();

    return () => {
      cancelled = true;
    };
  }, [
    aprobarParam,
    rechazarParam,
    accionParam,
    isAdmin,
    authModal?.repuesto.id,
  ]);

  // =====================================================================
  // SELECCIONAR REPUESTO
  // =====================================================================

  function handleSeleccionarRepuesto(repuesto: RepuestoRow) {
    setRepuestoSeleccionado(repuesto);

    const params = new URLSearchParams(searchParams.toString());

    params.set("repuestosTab", tab);
    params.set("repuesto", repuesto.id);

    params.delete("aprobar");
    params.delete("rechazar");
    params.delete("accion");

    paginaBuscadaParaRepuestoRef.current = repuesto.id;

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  }

  function handleCerrarDetalle() {
    const params = new URLSearchParams(searchParams.toString());

    params.delete("repuesto");
    params.delete("aprobar");
    params.delete("rechazar");
    params.delete("accion");

    paginaBuscadaParaRepuestoRef.current = null;

    const query = params.toString();

    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  // =====================================================================
  // ABRIR AUTORIZACIÓN
  // =====================================================================

  function handleAbrirAutorizacion(
    repuesto: RepuestoRow,
    accion: "autorizado" | "rechazado",
  ) {
    if (
      !isAdmin ||
      repuesto.estado !== "pendiente" ||
      repuesto.garantia_cubre_repuesto
    ) {
      return;
    }
    ignorarModalDesdeUrl.current = false;

    const params = new URLSearchParams(searchParams.toString());

    params.delete("aprobar");
    params.delete("rechazar");

    if (accion === "autorizado") {
      params.set("aprobar", repuesto.id);
    } else {
      params.set("rechazar", repuesto.id);
    }

    params.set("accion", accion);

    // Mantener el repuesto seleccionado
    params.set("repuesto", repuesto.id);

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });

    setAuthModal({
      repuesto,
      accion,
    });
  }

  // =====================================================================
  // MARCAR COMO RECIBIDO
  // =====================================================================

  async function handleMarcarRecibido(repuesto: RepuestoRow) {
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error("No se pudo identificar al usuario actual.");
      }

      if (!isAdmin) {
        throw new Error(
          "Solo los administradores pueden realizar esta acción.",
        );
      }

      const { error: updateError } = await supabase
        .from("repuestos_solicitados")
        .update({
          recibido: true,
          recibido_por: auth.user.id,
          recibido_en: new Date().toISOString(),
        })
        .eq("id", repuesto.id)
        .eq("estado", "comprado")
        .eq("recibido", false);

      if (updateError) {
        throw updateError;
      }

      await fetchRepuestos();
    } catch (error) {
      console.error("Error marcando repuesto como recibido:", error);

      alert(
        error instanceof Error
          ? error.message
          : "No se pudo marcar el repuesto como recibido.",
      );
    }
  }

  // =====================================================================
  // MARCAR COMO INSTALADO
  // =====================================================================

  async function handleMarcarInstalado(repuesto: RepuestoRow) {
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error("No se pudo identificar al usuario actual.");
      }

      if (!isAdmin) {
        throw new Error(
          "Solo los administradores pueden realizar esta acción.",
        );
      }

      if (!repuesto.origen_id) {
        throw new Error("Asigna el repuesto a una orden antes de instalarlo.");
      }

      // ---------------------------------------------------------------
      // 1. Marcar este repuesto como instalado
      // ---------------------------------------------------------------

      const { error: updateError } = await supabase
        .from("repuestos_solicitados")
        .update({
          instalado: true,
          instalado_por: auth.user.id,
          instalado_en: new Date().toISOString(),
        })
        .eq("id", repuesto.id)
        .eq("recibido", true)
        .eq("instalado", false);

      if (updateError) {
        throw updateError;
      }

      // ---------------------------------------------------------------
      // 2. Si pertenece a una orden, comprobar sus repuestos
      // ---------------------------------------------------------------

      if (repuesto.origen_tipo === "orden_servicio") {
        const { data: repuestosOrden, error: repuestosError } = await supabase
          .from("repuestos_solicitados")
          .select("id, instalado")
          .eq("origen_tipo", "orden_servicio")
          .eq("origen_id", repuesto.origen_id)
          .neq("estado", "rechazado");

        if (repuestosError) {
          throw repuestosError;
        }

        const todosInstalados =
          (repuestosOrden ?? []).length > 0 &&
          repuestosOrden.every((item) => item.instalado === true);

        // -------------------------------------------------------------
        // 3. Si todos están instalados → orden en reparación
        // -------------------------------------------------------------

        if (todosInstalados) {
          const { error: ordenError } = await supabase
            .from("ordenes_servicio")
            .update({
              estado: "en_reparacion",
            })
            .eq("id", repuesto.origen_id);

          if (ordenError) {
            throw ordenError;
          }
        }
      }

      await fetchRepuestos();
    } catch (error) {
      console.error("Error marcando repuesto como instalado:", error);

      alert(
        error instanceof Error
          ? error.message
          : "No se pudo marcar el repuesto como instalado.",
      );
    }
  }

  // =====================================================================
  // MARCAR COMO COMPRADO
  // =====================================================================

  async function handleMarcarComprado(repuesto: RepuestoRow) {
    try {
      // ---------------------------------------------------------------
      // 1. OBTENER USUARIO ACTUAL
      // ---------------------------------------------------------------

      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error("No se pudo identificar al usuario actual.");
      }

      if (!isAdmin) {
        throw new Error(
          "Solo los administradores pueden realizar esta acción.",
        );
      }

      // ---------------------------------------------------------------
      // 2. MARCAR REPUESTO COMO COMPRADO
      // ---------------------------------------------------------------

      const { error: updateError } = await supabase
        .from("repuestos_solicitados")
        .update({
          estado: "comprado",
          comprado_por: auth.user.id,
          comprado_en: new Date().toISOString(),
        })
        .eq("id", repuesto.id)
        .eq("estado", "autorizado");

      if (updateError) {
        throw updateError;
      }

      // ---------------------------------------------------------------
      // 3. CERRAR MODAL
      // ---------------------------------------------------------------

      setCompraModal(null);

      // ---------------------------------------------------------------
      // 4. NOTIFICAR AL CLIENTE
      // ---------------------------------------------------------------

      if (repuesto.origen_tipo === "orden_servicio" && repuesto.origen_id) {
        try {
          const response = await fetch("/api/ordenes/notificar-comprado", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ordenId: repuesto.origen_id,
            }),
          });

          const resultado = await response.json();

          if (!response.ok) {
            console.error(
              "El repuesto fue marcado como comprado, pero no se pudo notificar al cliente:",
              resultado,
            );

            alert(
              resultado?.error ??
                "El repuesto fue comprado, pero no se pudo enviar el correo al cliente.",
            );
          }
        } catch (error) {
          console.error("Error llamando a la API de notificación:", error);

          alert(
            "El repuesto fue marcado como comprado, pero ocurrió un error al enviar el correo al cliente.",
          );
        }
      }

      // ---------------------------------------------------------------
      // 5. ACTUALIZAR LA TABLA
      // ---------------------------------------------------------------

      await fetchRepuestos();
    } catch (error) {
      console.error("Error marcando como comprado:", error);

      alert(
        error instanceof Error
          ? error.message
          : "No se pudo marcar el repuesto como comprado.",
      );
    }
  }

  // =====================================================================
  // CAMBIAR TAB
  // =====================================================================

  function handleTabChange(newTab: TabKey) {
    setPage(1);

    paginaBuscadaParaRepuestoRef.current = null;

    const params = new URLSearchParams(searchParams.toString());

    params.set("repuestosTab", newTab);

    // Cambiar de tab elimina la selección
    params.delete("repuesto");

    // También eliminamos cualquier modal
    params.delete("aprobar");
    params.delete("rechazar");
    params.delete("accion");

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  }

  // =====================================================================
  // PAGINACIÓN
  // =====================================================================

  function handlePreviousPage() {
    setPage((currentPage) => Math.max(1, currentPage - 1));
  }

  function handleNextPage() {
    setPage((currentPage) => Math.min(totalPages, currentPage + 1));
  }

  // =====================================================================
  // INFORMACIÓN DE PAGINACIÓN
  // =====================================================================

  const firstItem = totalRows === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const lastItem = Math.min(page * PAGE_SIZE, totalRows);

  const colSpan = isAdmin ? 8 : 7;

  // =====================================================================
  // RENDER
  // =====================================================================

  return (
    <div className="mb-4 flex h-[min(88vh,860px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ===============================================================
          HEADER
      =============================================================== */}
      <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-bold leading-tight text-gray-900">
              Repuestos
            </h2>

            <p className="mt-0.5 text-xs text-gray-400">
              Solicitudes de repuestos de todas las órdenes de servicio.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setStockModal({ mode: "crear" })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Agregar repuesto
            </button>
          )}

          <div className="hidden text-right sm:block">
            <div className="text-lg font-bold leading-tight text-gray-900">
              {totalRows}
            </div>

            <div className="text-[11px] text-gray-400">
              {tab === "todos" ? "en total" : ESTADO_LABELS[tab].toLowerCase()}
            </div>
          </div>
        </div>
      </div>

      {/* ===============================================================
          TABS
      =============================================================== */}
      <div className="flex flex-shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-200 px-5 py-2.5">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t.key)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}

              {tab === t.key && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                  {totalRows}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ===============================================================
          TABLA
      =============================================================== */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          {/* HEADER */}

          <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
            <tr className="text-[10px] uppercase tracking-wide text-gray-400">
              <th className="px-5 py-2.5 font-medium">Repuesto</th>

              <th className="px-3 py-2.5 font-medium">Cant.</th>

              <th className="px-3 py-2.5 font-medium">Valor</th>

              <th className="px-3 py-2.5 font-medium">Origen</th>

              <th className="px-3 py-2.5 font-medium">Solicitado</th>

              <th className="px-3 py-2.5 font-medium">Estado</th>

              <th className="px-3 py-2.5 font-medium">Gestionado por</th>

              {isAdmin && (
                <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
              )}
            </tr>
          </thead>

          {/* BODY */}

          <tbody className="divide-y divide-gray-100">
            {/* CARGANDO */}

            {loading && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-16">
                  <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin" />

                    <span>Cargando repuestos...</span>
                  </div>
                </td>
              </tr>
            )}

            {/* ERROR */}

            {!loading && error && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-16">
                  <div className="flex flex-col items-center justify-center gap-2 text-rose-500">
                    <AlertTriangle className="h-5 w-5" />

                    <span>Error al cargar repuestos: {error}</span>
                  </div>
                </td>
              </tr>
            )}

            {/* SIN RESULTADOS */}

            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-16">
                  <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                    <Inbox className="h-6 w-6" />

                    <span>No hay repuestos que coincidan con este filtro.</span>
                  </div>
                </td>
              </tr>
            )}

            {/* FILAS */}

            {!loading &&
              !error &&
              rows.map((r) => {
                const orden =
                  r.origen_tipo === "orden_servicio" && r.origen_id
                    ? ordenesById[r.origen_id]
                    : null;

                const autorizador = r.autorizado_por
                  ? usuariosById[r.autorizado_por]
                  : null;

                const rechazador = r.rechazado_por
                  ? usuariosById[r.rechazado_por]
                  : null;

                const comprador = r.comprado_por
                  ? usuariosById[r.comprado_por]
                  : null;

                const esRepuestoDestacado = r.id === repuestoParam;

                return (
                  <tr
                    key={r.id}
                    ref={(el) => {
                      filasRepuestosRef.current[r.id] = el;
                    }}
                    onClick={() => handleSeleccionarRepuesto(r)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();

                        handleSeleccionarRepuesto(r);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-selected={esRepuestoDestacado}
                    title="Seleccionar repuesto"
                    className={`cursor-pointer text-gray-700 outline-none transition-all duration-500 ${
                      esRepuestoDestacado
                        ? "bg-amber-50/80 shadow-[inset_4px_0_0_0_rgb(245,158,11)] hover:bg-amber-100/80 focus:bg-amber-100/80"
                        : "hover:bg-slate-50/80 focus:bg-slate-50/80"
                    }`}
                  >
                    {/* =================================================
                        REPUESTO
                    ================================================= */}

                    <td className="px-5 py-2 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {esRepuestoDestacado && (
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-500 shadow-sm"
                            title="Repuesto seleccionado"
                          />
                        )}

                        <span>{r.nombre_repuesto}</span>
                      </div>
                    </td>

                    {/* =================================================
                        CANTIDAD
                    ================================================= */}

                    <td className="px-3 py-2">
                      <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                        {r.cantidad}
                      </span>
                    </td>

                    {/* =================================================
                        VALOR
                    ================================================= */}

                    <td className="px-3 py-2 font-medium text-gray-700">
                      {formatCLP(r.valor)}
                    </td>

                    {/* =================================================
                        ORIGEN
                    ================================================= */}

                    <td className="px-3 py-2">
                      {orden ? (
                        <>
                          <div className="flex items-center gap-1.5 font-medium text-gray-900">
                            {orden.numero_orden}

                            {r.desde_stock && (
                              <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700">
                                STOCK
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-gray-400">
                            {orden.cliente?.nombre_razon_social ?? "—"}
                          </div>
                        </>
                      ) : r.desde_stock && !r.origen_id ? (
                        <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-600/20">
                          Stock sin asignar
                        </span>
                      ) : (
                        <span className="text-gray-400">{r.origen_tipo}</span>
                      )}
                    </td>

                    {/* =================================================
                        FECHA
                    ================================================= */}

                    <td className="px-3 py-2 text-gray-500">
                      {new Date(r.created_at).toLocaleDateString("es-CL")}
                    </td>

                    {/* =================================================
                        ESTADO
                    ================================================= */}

                    <td className="px-3 py-2">
                      <EstadoBadge estado={r.estado} />
                    </td>

                    {/* =================================================
                        GESTIONADO POR
                    ================================================= */}

                    <td className="px-3 py-2">
                      {/* PENDIENTE */}

                      {r.estado === "pendiente" && (
                        <span className="text-gray-300">—</span>
                      )}

                      {/* AUTORIZADO */}

                      {r.estado === "autorizado" &&
                        (autorizador ? (
                          <div className="flex items-center gap-2">
                            <InitialsAvatar nombre={autorizador.nombre} />

                            <div>
                              <div className="font-medium text-gray-700">
                                {autorizador.nombre}
                              </div>

                              <div className="text-[10px] text-gray-400">
                                {formatFechaHora(r.autorizado_en)}
                              </div>
                            </div>

                            {r.motivo_autorizacion && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  setMotivoModal({
                                    tipo: "autorizado",
                                    motivo: r.motivo_autorizacion!,
                                    repuestoNombre: r.nombre_repuesto,
                                  });
                                }}
                                className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                                title="Ver motivo de autorización"
                                aria-label="Ver motivo de autorización"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        ))}

                      {/* RECHAZADO */}

                      {r.estado === "rechazado" &&
                        (rechazador ? (
                          <div className="flex items-center gap-2">
                            <InitialsAvatar nombre={rechazador.nombre} />

                            <div>
                              <div className="font-medium text-gray-700">
                                {rechazador.nombre}
                              </div>

                              <div className="text-[10px] text-gray-400">
                                {formatFechaHora(r.rechazado_en)}
                              </div>
                            </div>

                            {r.motivo_rechazo && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  setMotivoModal({
                                    tipo: "rechazado",
                                    motivo: r.motivo_rechazo!,
                                    repuestoNombre: r.nombre_repuesto,
                                  });
                                }}
                                className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-rose-50 hover:text-rose-600"
                                title="Ver motivo del rechazo"
                                aria-label="Ver motivo del rechazo"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        ))}

                      {/* COMPRADO */}

                      {r.estado === "comprado" &&
                        (comprador ? (
                          <div className="flex items-center gap-2">
                            <InitialsAvatar nombre={comprador.nombre} />

                            <div>
                              <div className="font-medium text-gray-700">
                                {comprador.nombre}
                              </div>

                              <div className="text-[10px] text-gray-400">
                                {formatFechaHora(r.comprado_en)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        ))}
                    </td>

                    {/* =================================================
                        ACCIONES
                    ================================================= */}

                    {isAdmin && (
                      <td className="px-5 py-2">
                        {/* ADMINISTRADOR: Aprobar / Rechazar */}

                        {isAdmin &&
                          r.estado === "pendiente" &&
                          !r.garantia_cubre_repuesto && (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* APROBAR */}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  handleAbrirAutorizacion(r, "autorizado");
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-md active:scale-95"
                              >
                                <Check
                                  className="h-3.5 w-3.5"
                                  strokeWidth={2.5}
                                />
                                Aprobar
                              </button>

                              {/* RECHAZAR */}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  handleAbrirAutorizacion(r, "rechazado");
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition-all hover:bg-rose-50 hover:ring-rose-300 active:scale-95"
                              >
                                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                Rechazar
                              </button>
                            </div>
                          )}

                        {/* ADMINISTRADOR: Marcar como comprado */}

                        {isAdmin && r.estado === "autorizado" && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();

                                setCompraModal(r);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-md active:scale-95"
                            >
                              <ShoppingCart
                                className="h-3.5 w-3.5"
                                strokeWidth={2.5}
                              />
                              Marcar comprado
                            </button>
                          </div>
                        )}

                        {/* TÉCNICO / SUPERVISOR / ADMIN: Recepción, asignación e instalación */}

                        {r.estado === "comprado" && (
                          <div className="flex justify-end gap-1.5">
                            {/* RECIBIR */}

                            {!r.recibido && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  handleMarcarRecibido(r);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-amber-500/20 transition-all hover:bg-amber-600 hover:shadow-md active:scale-95"
                              >
                                <PackageCheck
                                  className="h-3.5 w-3.5"
                                  strokeWidth={2.5}
                                />
                                Marcar recibido
                              </button>
                            )}

                            {/* ASIGNAR (stock sin orden) */}

                            {r.desde_stock && !r.origen_id && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  setStockModal({
                                    mode: "asignar",
                                    repuesto: r,
                                  });
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-violet-600/20 transition-all hover:bg-violet-700 hover:shadow-md active:scale-95"
                              >
                                <Link2
                                  className="h-3.5 w-3.5"
                                  strokeWidth={2.5}
                                />
                                Asignar a orden
                              </button>
                            )}

                            {/* INSTALAR (exige orden asignada) */}

                            {r.recibido && !r.instalado && r.origen_id && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  handleMarcarInstalado(r);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-violet-600/20 transition-all hover:bg-violet-700 hover:shadow-md active:scale-95"
                              >
                                <Wrench
                                  className="h-3.5 w-3.5"
                                  strokeWidth={2.5}
                                />
                                Marcar instalado
                              </button>
                            )}

                            {/* COMPLETADO */}

                            {r.recibido && r.instalado && (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700">
                                <Check
                                  className="h-3.5 w-3.5"
                                  strokeWidth={2.5}
                                />
                                Instalado
                              </span>
                            )}
                          </div>
                        )}

                        {/* RECHAZADO */}

                        {r.estado === "rechazado" && (
                          <div className="text-right text-gray-300">—</div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* ===============================================================
          PAGINACIÓN
      =============================================================== */}
      {!loading && !error && totalRows > 0 && (
        <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-200 px-5 py-3">
          <div className="text-xs text-gray-400">
            Mostrando{" "}
            <span className="font-medium text-gray-600">{firstItem}</span>
            {" - "}
            <span className="font-medium text-gray-600">{lastItem}</span>
            {" de "}
            <span className="font-medium text-gray-600">{totalRows}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreviousPage}
              disabled={page === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </button>

            <span className="whitespace-nowrap px-1 text-xs text-gray-500">
              Página <span className="font-medium text-gray-700">{page}</span>{" "}
              de <span className="font-medium text-gray-700">{totalPages}</span>
            </span>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ===============================================================
          MINIMODAL DE MOTIVO
      =============================================================== */}
      {motivoModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[2px]"
          onClick={() => setMotivoModal(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    motivoModal.tipo === "autorizado"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-rose-600"
                  }`}
                >
                  <Eye className="h-4 w-4" />
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900">
                    {motivoModal.tipo === "autorizado"
                      ? "Motivo de autorización"
                      : "Motivo del rechazo"}
                  </h3>

                  <p className="text-[10px] text-gray-400">
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

            {/* MOTIVO */}

            <div className="px-4 py-4">
              <div
                className={`rounded-lg border p-3 ${
                  motivoModal.tipo === "autorizado"
                    ? "border-emerald-100 bg-emerald-50/50"
                    : "border-rose-100 bg-rose-50/50"
                }`}
              >
                <p className="text-xs leading-relaxed text-gray-700">
                  {motivoModal.motivo}
                </p>
              </div>
            </div>

            {/* FOOTER */}

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

      {/* DRAWER DE DETALLE DEL REPUESTO */}
      {repuestoSeleccionado && (
        <RepuestoDrawer
          repuesto={repuestoSeleccionado}
          usuariosById={usuariosById}
          maquinasById={maquinasById}
          onClose={() => {
            setRepuestoSeleccionado(null);
            handleCerrarDetalle();
          }}
        />
      )}

      {/* ===============================================================
          MODAL AUTORIZACIÓN / RECHAZO
      =============================================================== */}
      {authModal && (
        <AutorizacionModal
          repuestoNombre={authModal.repuesto.nombre_repuesto}
          accion={authModal.accion}
          repuestoId={authModal.repuesto.id}
          onClose={() => {
            ignorarModalDesdeUrl.current = true;

            const params = new URLSearchParams(searchParams.toString());

            params.delete("aprobar");

            params.delete("rechazar");

            params.delete("accion");

            // IMPORTANTE:
            // mantenemos `repuesto` para que
            // la fila continúe seleccionada.

            const query = params.toString();

            setAuthModal(null);

            router.replace(query ? `${pathname}?${query}` : pathname, {
              scroll: false,
            });
          }}
          onConfirmed={async () => {
            ignorarModalDesdeUrl.current = true;

            const params = new URLSearchParams(searchParams.toString());

            params.delete("aprobar");

            params.delete("rechazar");

            params.delete("accion");

            // Mantenemos el `repuesto`
            // seleccionado en la URL.

            const query = params.toString();

            setAuthModal(null);

            router.replace(query ? `${pathname}?${query}` : pathname, {
              scroll: false,
            });

            await fetchRepuestos();
          }}
        />
      )}

      {/* ===============================================================
          MODAL COMPRA
      =============================================================== */}
      {compraModal && (
        <ConfirmarCompraModal
          repuestoNombre={compraModal.nombre_repuesto}
          onClose={() => setCompraModal(null)}
          onConfirm={() => handleMarcarComprado(compraModal)}
        />
      )}

      {/* ===============================================================
          MODAL AGREGAR / ASIGNAR REPUESTO DE STOCK
      =============================================================== */}
      {stockModal && (
        <AgregarRepuestoModal
          {...(stockModal.mode === "crear"
            ? { mode: "crear" as const }
            : {
                mode: "asignar" as const,
                repuestoId: stockModal.repuesto.id,
                repuestoNombre: stockModal.repuesto.nombre_repuesto,
              })}
          onClose={() => setStockModal(null)}
          onSaved={async () => {
            setStockModal(null);
            await fetchRepuestos();
          }}
        />
      )}
    </div>
  );
}
