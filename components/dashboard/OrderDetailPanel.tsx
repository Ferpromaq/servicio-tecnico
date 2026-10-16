"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { orderStatusStyles } from "@/lib/mockData";
import DiagnosticoPanel from "@/app/(app)/ordenes/DiagnosticoPanel";

/**
 * ============================================================
 * FASES VISUALES
 * ============================================================
 *
 * Estas NO necesariamente son iguales a los estados de la BD.
 *
 * El dashboard muestra 5 fases:
 *
 * Recepción → Diagnóstico → Repuestos → Reparación → Entrega
 */
const FASES_VISUALES = [
  {
    key: "recepcion",
    label: "Recepción",
  },
  {
    key: "diagnostico",
    label: "Diagnóstico",
  },
  {
    key: "repuestos",
    label: "Repuestos",
  },
  {
    key: "reparacion",
    label: "Reparación",
  },
  {
    key: "entrega",
    label: "Entrega",
  },
] as const;

/**
 * ============================================================
 * MAPEO DE ESTADOS DE BD → FASE VISUAL
 * ============================================================
 *
 * Aquí podemos tener todos los estados reales que utiliza
 * la aplicación y decir en qué fase visual deben aparecer.
 */
const ESTADO_A_FASE: Record<string, string> = {
  // Recepción
  recepcion: "recepcion",

  // Diagnóstico
  diagnostico: "diagnostico",
  esperando_autorizacion_cliente: "diagnostico",

  // Repuestos
  esperando_autorizacion_jefe: "repuestos",
  esperando_repuestos: "repuestos",
  autorizada: "repuestos",

  // Reparación
  reparacion: "reparacion",

  // Entrega
  lista_para_entrega: "entrega",
  entregada: "entrega",
};

/**
 * Normaliza el estado por si en algún momento viene
 * con mayúsculas, espacios o acentos.
 */
function normalizarEstado(estado: string | null | undefined): string {
  if (!estado) return "";

  return estado
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * ============================================================
 * NORMALIZAR RELACIONES DE SUPABASE (cliente / máquina / técnico)
 * ============================================================
 *
 * Supabase, dependiendo de cómo detecte la relación FK, puede
 * devolver un join "a uno" como:
 *
 *   - un ARRAY con un solo elemento: [{ ... }]
 *   - o el OBJETO directo:            { ... }
 *
 * Antes el código asumía siempre array (`data.cliente?.[0]`), y
 * cuando Supabase devolvía el objeto directo, ese acceso fallaba
 * en silencio (undefined), dejando Cliente/Máquina/Técnico en
 * blanco aunque los datos sí existieran en la BD.
 *
 * Este helper acepta ambas formas y siempre devuelve un único
 * objeto (o null si no hay datos).
 */
function toSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

/**
 * ============================================================
 * REALTIME: helper anti-duplicados
 * ============================================================
 *
 * Bug que arregla esto:
 *
 * "cannot add `postgres_changes` callbacks for realtime:X after
 *  `subscribe()`."
 *
 * Esto pasa cuando ya existe (en el registro interno del cliente
 * de Supabase) un canal con el MISMO nombre que ya fue suscrito,
 * y el código intenta encadenar `.on()` sobre él de nuevo.
 *
 * Ocurre típicamente en desarrollo por el doble-invoke de efectos
 * de React Strict Mode / Fast Refresh: el efecto se monta, limpia
 * y se vuelve a montar, y si el `removeChannel` del cleanup aún
 * no terminó de propagarse cuando el segundo montaje llama
 * `supabase.channel(mismoNombre)`, Supabase devuelve la instancia
 * vieja ya suscrita en vez de crear una nueva.
 *
 * Este helper se asegura de remover explícitamente cualquier canal
 * previo con el mismo nombre ANTES de crear uno nuevo, evitando
 * el choque sin importar el orden de los efectos.
 */
function getFreshChannel(name: string) {
  const topic = `realtime:${name}`;
  const existing = supabase.getChannels().find((c) => c.topic === topic);

  if (existing) {
    supabase.removeChannel(existing);
  }

  return supabase.channel(name);
}

/**
 * ============================================================
 * REPUESTOS (solo lectura)
 * ============================================================
 *
 * El formulario para SOLICITAR repuestos vive en el drawer del
 * módulo de Órdenes de Servicio (OrdenesServicioView.tsx), no
 * acá. Este panel solo muestra lo que ya fue solicitado y su
 * estado de gestión (pendiente/autorizado/rechazado/comprado).
 */
type EstadoRepuesto = "pendiente" | "autorizado" | "rechazado" | "comprado";

type RepuestoPreview = {
  id: string;
  nombre_repuesto: string;
  cantidad: number;
  valor: number;
  estado: EstadoRepuesto;
  created_at: string;
};

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
  const label = ESTADO_REPUESTO_LABELS[estado] ?? estado;

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}

function formatCLP(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-CL")}`;
}

type OrderDetail = {
  id: string;
  numeroOrden: string;
  estado: string;
  cliente: string;
  telefono: string | null;
  rut: string | null;
  maquina: string;
  modelo: string | null;
  nSerie: string | null;
  fechaIngreso: string;
  tecnicoAsignado: string | null;
  garantiaIngreso: boolean | null;
  garantiaPerdida: boolean;
  razonNoCubre: string | null;
  descripcionProblema: string | null;
  diagnostico: string | null;
  observaciones: string | null;
  tabs: string[];
  maquinaId: string | null;
};

type StatusStepProps = {
  label: string;
  fecha: string;
  estado: "done" | "current" | "pending";
};

function StatusStep({ label, fecha, estado }: StatusStepProps) {
  const isDone = estado === "done";
  const isCurrent = estado === "current";

  return (
    <div className="flex flex-col items-center min-w-[56px] sm:min-w-0">
      <div
        className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[11px] font-semibold shrink-0 ${
          isDone
            ? "bg-green-500 text-white"
            : isCurrent
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-400"
        }`}
      >
        {isDone && <CheckCircle2 size={14} />}
      </div>

      <p
        className={`mt-1.5 text-[10px] sm:text-[11px] text-center font-medium ${
          isDone || isCurrent ? "text-gray-700" : "text-gray-400"
        }`}
      >
        {label}
      </p>

      {fecha && <span className="text-[10px] text-gray-400">{fecha}</span>}
    </div>
  );
}

type OrderDetailPanelProps = {
  orderId: string | null;
};

/**
 * ============================================================
 * TIPO DE LA RESPUESTA CRUDA DE SUPABASE
 * ============================================================
 *
 * cliente / maquina / tecnico se tipan como "objeto O array de
 * un objeto" porque Supabase puede devolver cualquiera de las
 * dos formas dependiendo de cómo detecte la relación FK.
 */
type OrderDetailQuery = {
  id: string;
  numero_orden: string;
  estado: string;
  descripcion_problema: string | null;
  diagnostico: string | null;
  garantia_ingreso: boolean | null;
  garantia_cubre_dano: boolean | null;
  razon_no_cubre: string | null;
  created_at: string;
  maquina_id: string | null;

  cliente:
    | {
        nombre_razon_social: string;
        telefono: string | null;
        rut: string | null;
      }
    | {
        nombre_razon_social: string;
        telefono: string | null;
        rut: string | null;
      }[]
    | null;

  maquina:
    | {
        nombre: string;
        modelo: string | null;
        numero_serie: string | null;
      }
    | {
        nombre: string;
        modelo: string | null;
        numero_serie: string | null;
      }[]
    | null;

  tecnico:
    | {
        nombre: string;
      }
    | {
        nombre: string;
      }[]
    | null;
};

function mapOrder(data: OrderDetailQuery): OrderDetail {
  const cliente = toSingle(data.cliente);
  const maquina = toSingle(data.maquina);
  const tecnico = toSingle(data.tecnico);

  return {
    id: data.id,
    numeroOrden: data.numero_orden,
    estado: data.estado,
    cliente: cliente?.nombre_razon_social ?? "",
    telefono: cliente?.telefono ?? null,
    rut: cliente?.rut ?? null,
    maquina: maquina?.nombre ?? "",
    modelo: maquina?.modelo ?? null,
    nSerie: maquina?.numero_serie ?? null,
    fechaIngreso: new Date(data.created_at).toLocaleString("es-CL"),
    tecnicoAsignado: tecnico?.nombre ?? "Sin asignar",
    maquinaId: data.maquina_id ?? null,

    // Garantía de ingreso: se mantiene tal cual entró, sin importar el diagnóstico.
    garantiaIngreso: data.garantia_ingreso,

    // Solo se marca "perdida" si entró con garantía Y el técnico determinó
    // explícitamente que el daño no está cubierto.
    garantiaPerdida:
      data.garantia_ingreso === true && data.garantia_cubre_dano === false,

    razonNoCubre: data.razon_no_cubre,

    descripcionProblema: data.descripcion_problema,
    diagnostico: data.diagnostico,
    observaciones: data.razon_no_cubre,

    tabs: ["Resumen", "Diagnóstico", "Repuestos", "Pagos", "Historial"],
  };
}

export default function OrderDetailPanel({ orderId }: OrderDetailPanelProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null);

  const [activeTab, setActiveTab] = useState("Resumen");

  const [loading, setLoading] = useState(true);

  const [proximoMantenimiento, setProximoMantenimiento] = useState<
    string | null
  >(null);

  const [cargandoMantenimiento, setCargandoMantenimiento] = useState(false);

  const [errorMantenimiento, setErrorMantenimiento] = useState(false);

  /**
   * ============================================================
   * REPUESTOS (solo lectura)
   * ============================================================
   */
  const [repuestos, setRepuestos] = useState<RepuestoPreview[] | null>(null);

  const [loadingRepuestos, setLoadingRepuestos] = useState(false);

  const [errorRepuestos, setErrorRepuestos] = useState<string | null>(null);

  const loadRepuestos = useCallback(async () => {
    if (!order) return;

    setLoadingRepuestos(true);
    setErrorRepuestos(null);

    const { data, error } = await supabase
      .from("repuestos_solicitados")
      .select("id, nombre_repuesto, cantidad, valor, estado, created_at")
      .eq("origen_tipo", "orden_servicio")
      .eq("origen_id", order.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando repuestos:", error);
      setErrorRepuestos(error.message);
      setRepuestos([]);
      setLoadingRepuestos(false);
      return;
    }

    setRepuestos((data as RepuestoPreview[]) ?? []);
    setLoadingRepuestos(false);
  }, [order]);

  // Carga perezosa: solo consulta cuando se entra a la pestaña Repuestos.
  useEffect(() => {
    if (activeTab === "Repuestos" && order && repuestos === null) {
      loadRepuestos();
    }
  }, [activeTab, order, repuestos, loadRepuestos]);

  // Si cambia la orden seleccionada, limpiamos los repuestos cargados
  // para que se vuelvan a pedir cuando corresponda.
  useEffect(() => {
    setRepuestos(null);
  }, [order?.id]);

  // Realtime: si el técnico/supervisor agrega o el admin gestiona un
  // repuesto desde el drawer del módulo de Órdenes, este panel se
  // actualiza solo, sin que el usuario tenga que recargar.
  //
  // Importante: dependemos de `order?.id` (string) y NO del objeto
  // `order` completo. `order` se re-crea en cada `loadOrder()` / cada
  // vez que `DiagnosticoPanel` actualiza el estado local, lo que
  // destruía y volvía a montar este efecto sin necesidad, aumentando
  // el riesgo de chocar con un canal todavía no removido.

  useEffect(() => {
    let activo = true;

    async function cargarProximoMantenimiento() {
      if (!order?.maquinaId) {
        setProximoMantenimiento(null);
        setCargandoMantenimiento(false);
        return;
      }

      setCargandoMantenimiento(true);
      setErrorMantenimiento(false);

      const ahora = new Date();
      const hoy = [
        ahora.getFullYear(),
        String(ahora.getMonth() + 1).padStart(2, "0"),
        String(ahora.getDate()).padStart(2, "0"),
      ].join("-");

      const { data, error } = await supabase
        .from("mantenimientos")
        .select("proxima_revision")
        .eq("maquina_id", order.maquinaId)
        .gte("proxima_revision", hoy)
        .order("proxima_revision", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!activo) return;

      if (error) {
        console.error("Error al consultar el próximo mantenimiento:", error);
        setProximoMantenimiento(null);
        setErrorMantenimiento(true);
      } else {
        setProximoMantenimiento(data?.proxima_revision ?? null);
      }

      setCargandoMantenimiento(false);
    }

    cargarProximoMantenimiento();

    return () => {
      activo = false;
    };
  }, [order?.maquinaId]);

  useEffect(() => {
    if (!order?.id) return;

    const orderIdForChannel = order.id;
    const channel = getFreshChannel(`repuestos-preview-${orderIdForChannel}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "repuestos_solicitados",
          filter: `origen_id=eq.${orderIdForChannel}`,
        },
        () => {
          loadRepuestos();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, loadRepuestos]);

  /**
   * ============================================================
   * CARGAR ORDEN
   * ============================================================
   */
  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setOrder(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("ordenes_servicio")
      .select(
        `
  id,
  numero_orden,
  maquina_id,
  estado,
  descripcion_problema,
  diagnostico,
  garantia_ingreso,
  garantia_cubre_dano,
  razon_no_cubre,
  created_at,
  cliente:clientes (
    nombre_razon_social,
    telefono,
    rut
  ),
  maquina:maquinas (
    nombre,
    modelo,
    numero_serie
  ),
  tecnico:usuarios!ordenes_servicio_tecnico_id_fkey (
    nombre
  )
`,
      )
      .eq("id", orderId)
      .single();

    if (error || !data) {
      console.error("Error cargando orden:", error);

      setOrder(null);
      setLoading(false);
      return;
    }

    setOrder(mapOrder(data as unknown as OrderDetailQuery));

    setLoading(false);
  }, [orderId]);

  /**
   * ============================================================
   * CARGA INICIAL
   * ============================================================
   */
  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  /**
   * ============================================================
   * REALTIME (orden)
   * ============================================================
   *
   * Si el técnico modifica el diagnóstico o el estado,
   * actualizamos automáticamente el panel.
   *
   * Usa `getFreshChannel` para evitar el error:
   * "cannot add postgres_changes callbacks ... after subscribe()",
   * que ocurría cuando React (Strict Mode / Fast Refresh en dev)
   * montaba este efecto dos veces antes de que el `removeChannel`
   * del primer cleanup terminara de propagarse.
   */
  useEffect(() => {
    if (!orderId) return;

    const channel = getFreshChannel(`orden-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ordenes_servicio",
          filter: `id=eq.${orderId}`,
        },
        () => {
          loadOrder();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, loadOrder]);

  /**
   * ============================================================
   * CALCULAR PROGRESO
   * ============================================================
   */
  function calcularPasos(estadoActual: string) {
    const estadoNormalizado = normalizarEstado(estadoActual);

    /**
     * Convertimos el estado real de la BD
     * a una fase visual.
     *
     * Ejemplo:
     *
     * esperando_autorizacion_cliente
     *             ↓
     *       diagnostico
     */
    const faseActual = ESTADO_A_FASE[estadoNormalizado];

    /**
     * Si encontramos la fase, obtenemos
     * su posición.
     */
    const indiceActual = FASES_VISUALES.findIndex(
      (fase) => fase.key === faseActual,
    );

    /**
     * Estado desconocido.
     *
     * En vez de romper el componente,
     * dejamos todo pendiente.
     */
    if (indiceActual === -1) {
      console.warn("Estado sin mapeo visual:", estadoActual);

      return FASES_VISUALES.map((fase) => ({
        ...fase,
        fecha: "",
        estado: "pending" as const,
      }));
    }

    /**
     * Construimos cada paso.
     *
     * Ejemplo:
     *
     * Estado = reparacion
     *
     * Recepción  → done
     * Diagnóstico → done
     * Repuestos   → done
     * Reparación  → current
     * Entrega     → pending
     */
    return FASES_VISUALES.map((fase, index) => {
      let estado: "done" | "current" | "pending";

      if (index < indiceActual) {
        estado = "done";
      } else if (index === indiceActual) {
        estado = "current";
      } else {
        estado = "pending";
      }

      return {
        ...fase,
        fecha: "",
        estado,
      };
    });
  }

  /**
   * ============================================================
   * ESTADOS DE RENDERIZADO
   * ============================================================
   */

  if (!orderId) {
    return (
      <div className="p-4 text-sm text-gray-500">Selecciona una orden.</div>
    );
  }

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Cargando orden...</div>;
  }

  if (!order) {
    return (
      <div className="p-4 text-sm text-gray-500">No se encontró la orden.</div>
    );
  }

  const pasos = calcularPasos(order.estado);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-3 border-b border-gray-100">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            Orden de Servicio
          </h3>

          <p className="text-xs text-gray-400 truncate">{order.numeroOrden}</p>
        </div>

        <span
          className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-medium ${
            orderStatusStyles[order.estado as keyof typeof orderStatusStyles] ??
            "bg-gray-100 text-gray-600"
          }`}
        >
          {order.estado}
        </span>
      </div>

      {/* =====================================================
          TABS
      ===================================================== */}

      <div className="flex items-center gap-3 sm:gap-1 sm:justify-between px-3 border-b border-gray-100 overflow-x-auto no-scrollbar">
        {order.tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative pb-2 pt-1 text-xs whitespace-nowrap shrink-0 transition-colors ${
              activeTab === tab
                ? "text-blue-600 font-semibold"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}

            {activeTab === tab && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-orange-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* =====================================================
          CONTENIDO
      ===================================================== */}

      <div className="p-3 sm:p-4 space-y-5 overflow-y-auto">
        {/* ===================================================
            ESTADO ACTUAL
        =================================================== */}

        <div>
          <h4 className="text-[13px] font-semibold text-gray-900 mb-3">
            Estado Actual
          </h4>

          <div className="flex items-start overflow-x-auto no-scrollbar -mx-1 px-1">
            {pasos.map((paso, index) => (
              <div key={paso.key} className="flex items-center flex-1">
                <StatusStep
                  label={paso.label}
                  fecha={paso.fecha}
                  estado={paso.estado}
                />

                {index < pasos.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 min-w-[16px] -mt-5 ${
                      paso.estado === "done" ? "bg-green-500" : "bg-gray-100"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ===================================================
            RESUMEN
        =================================================== */}

        {activeTab === "Resumen" && (
          <>
            <div>
              <h4 className="text-[13px] font-semibold text-gray-900 mb-2">
                Información General
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-2 gap-y-3 gap-x-3 text-[13px]">
                <div>
                  <p className="text-[11px] text-gray-400">Cliente</p>

                  <p className="font-medium text-gray-800 break-words">
                    {order.cliente}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-400">Teléfono</p>

                  <p className="font-medium text-gray-800 break-words">
                    {order.telefono ?? "-"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-400">Máquina</p>

                  <p className="font-medium text-gray-800 break-words">
                    {order.maquina}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-400">Modelo</p>

                  <p className="font-medium text-gray-800 break-words">
                    {order.modelo ?? "-"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-400">N° Serie</p>

                  <p className="font-medium text-gray-800 break-words">
                    {order.nSerie ?? "-"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-400">Fecha Ingreso</p>

                  <p className="font-medium text-gray-800 break-words">
                    {order.fechaIngreso}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-400">Técnico Asignado</p>

                  <p className="font-medium text-gray-800 break-words">
                    {order.tecnicoAsignado}
                  </p>
                </div>

                {/*
                  ==========================================================
                  GARANTÍA DE INGRESO
                  ==========================================================
                  Este campo se calcula desde `garantia_ingreso`, que es el
                  estado real de si la máquina ENTRÓ con garantía o no. Es
                  independiente de `garantia_cubre_dano` (que solo se llena
                  cuando el técnico diagnostica si el daño puntual está
                  cubierto). Antes este campo no existía en el grid, por eso
                  no se veía nada aunque el dato sí estaba guardado en la BD.
                */}
                <div>
                  <p className="text-[11px] text-gray-400">Garantía</p>

                  <p className="font-medium text-gray-800">
                    {order.garantiaIngreso === true
                      ? "Con garantía"
                      : order.garantiaIngreso === false
                        ? "Sin garantía"
                        : "-"}
                  </p>
                </div>

                {/*
                  Aviso en rojo: solo aparece si la máquina ENTRÓ con
                  garantía pero el técnico determinó que el daño puntual
                  no está cubierto. La garantía de ingreso (arriba) se
                  mantiene visible igual, no se sobrescribe.
                */}
                {order.garantiaPerdida && (
                  <div className="col-span-2 rounded-lg bg-rose-50 px-3 py-2 ring-1 ring-inset ring-rose-600/20">
                    <p className="text-[12px] font-semibold text-rose-600">
                      Garantía no cubre este daño
                    </p>
                    <p className="text-[12px] text-rose-500 leading-relaxed">
                      {order.razonNoCubre ??
                        "El técnico no especificó el motivo."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-[13px] font-semibold text-gray-900 mb-1">
                Descripción del Problema
              </h4>

              <p className="text-[13px] text-gray-500 leading-relaxed">
                {order.descripcionProblema ?? "Sin información"}
              </p>
            </div>

            <div className="bg-orange-50/60 rounded-lg p-3 flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white text-orange-600 shrink-0">
                <Calendar size={15} />
              </div>

              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-900">
                  Próximo Mantenimiento
                </p>

                <p className="text-[12px] text-gray-500">
                  {cargandoMantenimiento
                    ? "Consultando..."
                    : errorMantenimiento
                      ? "No se pudo consultar"
                      : proximoMantenimiento
                        ? new Date(
                            `${proximoMantenimiento}T12:00:00`,
                          ).toLocaleDateString("es-CL")
                        : "No programado"}
                </p>
              </div>
            </div>
          </>
        )}

        {/* ===================================================
            DIAGNÓSTICO
        =================================================== */}

        {activeTab === "Diagnóstico" && (
          <DiagnosticoPanel
            ordenId={order.id}
            onUpdated={(patch) =>
              setOrder((prev) =>
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
        )}

        {/* ===================================================
            REPUESTOS (solo lectura)
        =================================================== */}

        {activeTab === "Repuestos" && (
          <div className="space-y-2">
            {loadingRepuestos && (
              <p className="text-sm text-gray-400">Cargando repuestos...</p>
            )}

            {!loadingRepuestos && errorRepuestos && (
              <p className="text-sm text-rose-500">
                Error al cargar repuestos: {errorRepuestos}
              </p>
            )}

            {!loadingRepuestos &&
              !errorRepuestos &&
              repuestos?.length === 0 && (
                <p className="text-sm text-gray-400">
                  Aún no se han solicitado repuestos para esta orden.
                </p>
              )}

            {!loadingRepuestos &&
              !errorRepuestos &&
              repuestos &&
              repuestos.length > 0 && (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {repuestos.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {r.nombre_repuesto}{" "}
                          <span className="text-gray-400">x{r.cantidad}</span>
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {formatCLP(r.valor)} ·{" "}
                          {new Date(r.created_at).toLocaleDateString("es-CL")}
                        </p>
                      </div>

                      <EstadoRepuestoBadge estado={r.estado} />
                    </li>
                  ))}
                </ul>
              )}
          </div>
        )}

        {/* ===================================================
            PAGOS
        =================================================== */}

        {activeTab === "Pagos" && (
          <p className="text-sm text-gray-400">
            Pendiente: conectar tabla de pagos aquí (igual que en el drawer del
            módulo de Órdenes).
          </p>
        )}

        {/* ===================================================
            HISTORIAL
        =================================================== */}

        {activeTab === "Historial" && (
          <p className="text-sm text-gray-400">
            Pendiente: conectar historial_estados aquí (igual que en el drawer
            del módulo de Órdenes).
          </p>
        )}
      </div>
    </div>
  );
}
