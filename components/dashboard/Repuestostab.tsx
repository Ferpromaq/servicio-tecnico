"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, AlertTriangle, Inbox, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type EstadoRepuesto = "pendiente" | "autorizado" | "rechazado" | "comprado";

type Repuesto = {
  id: string;
  nombre_repuesto: string;
  cantidad: number;
  valor: number;
  estado: EstadoRepuesto;
  created_at: string;
};

type Rol = "admin" | "tecnico" | "supervisor" | string;

const ESTADO_STYLES: Record<EstadoRepuesto, string> = {
  pendiente: "bg-amber-50 text-amber-700 ring-amber-600/20",
  autorizado: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rechazado: "bg-rose-50 text-rose-700 ring-rose-600/20",
  comprado: "bg-blue-50 text-blue-700 ring-blue-600/20",
};

const ESTADO_LABELS: Record<EstadoRepuesto, string> = {
  pendiente: "Pendiente",
  autorizado: "Autorizado",
  rechazado: "Rechazado",
  comprado: "Comprado",
};

const ROLES_QUE_PUEDEN_SOLICITAR: Rol[] = ["tecnico", "supervisor"];

function formatCLP(valor: number) {
  return `$${Math.round(valor).toLocaleString("es-CL")}`;
}

type RepuestosTabProps = {
  ordenId: string;
  maquinaId: string | null;
};

export default function RepuestosTab({
  ordenId,
  maquinaId,
}: RepuestosTabProps) {
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rol del usuario actual
  const [rol, setRol] = useState<Rol | null>(null);
  const [checkingRol, setCheckingRol] = useState(true);
  const [garantiaCubreRepuesto, setGarantiaCubreRepuesto] = useState(false);
  const [checkingGarantia, setCheckingGarantia] = useState(true);

  const puedeSolicitar =
    rol !== null && ROLES_QUE_PUEDEN_SOLICITAR.includes(rol);

  // Formulario
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [valor, setValor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function checkGarantia() {
      setCheckingGarantia(true);

      const { data, error } = await supabase
        .from("ordenes_servicio")
        .select("garantia_ingreso, garantia_cubre_dano")
        .eq("id", ordenId)
        .single();

      if (error) {
        console.error("Error obteniendo garantía de la orden:", error);
        setGarantiaCubreRepuesto(false);
        setCheckingGarantia(false);
        return;
      }

      setGarantiaCubreRepuesto(
        data?.garantia_ingreso === true && data?.garantia_cubre_dano === true,
      );

      setCheckingGarantia(false);
    }

    checkGarantia();
  }, [ordenId]);

  // =====================================================================
  // RESOLVER ROL DEL USUARIO ACTUAL
  // =====================================================================

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

  // =====================================================================
  // CARGAR REPUESTOS DE LA ORDEN
  // =====================================================================

  const loadRepuestos = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("repuestos_solicitados")
      .select("id, nombre_repuesto, cantidad, valor, estado, created_at")
      .eq("origen_tipo", "orden_servicio")
      .eq("origen_id", ordenId)
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("Error cargando repuestos:", queryError);
      setError(queryError.message);
      setRepuestos([]);
      setLoading(false);
      return;
    }

    setRepuestos((data as Repuesto[]) ?? []);
    setLoading(false);
  }, [ordenId]);

  useEffect(() => {
    loadRepuestos();
  }, [loadRepuestos]);

  // =====================================================================
  // REALTIME: si otro usuario agrega o gestiona un repuesto de esta orden
  // =====================================================================

  useEffect(() => {
    const channel = supabase
      .channel(`repuestos-orden-${ordenId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "repuestos_solicitados",
          filter: `origen_id=eq.${ordenId}`,
        },
        () => {
          loadRepuestos();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ordenId, loadRepuestos]);

  // =====================================================================
  // CREAR SOLICITUD DE REPUESTO
  // =====================================================================

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!puedeSolicitar) {
      setFormError("No tienes permiso para solicitar repuestos.");
      return;
    }

    if (checkingGarantia) {
      setFormError("Verificando cobertura de garantía...");
      return;
    }

    const nombreTrim = nombre.trim();
    const cantidadNum = Number(cantidad);
    const valorNum = Number(valor || 0);

    if (!nombreTrim) {
      setFormError("Ingresa el nombre del repuesto.");
      return;
    }

    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) {
      setFormError("La cantidad debe ser un número mayor a 0.");
      return;
    }

    if (!Number.isFinite(valorNum) || valorNum < 0) {
      setFormError("El valor no es válido.");
      return;
    }

    setSubmitting(true);

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error("No se pudo identificar al usuario actual.");
      }

      const { error: insertError } = await supabase
        .from("repuestos_solicitados")
        .insert({
          origen_tipo: "orden_servicio",
          origen_id: ordenId,
          maquina_id: maquinaId,
          nombre_repuesto: nombreTrim,
          cantidad: cantidadNum,
          valor: valorNum,
          estado: garantiaCubreRepuesto ? "autorizado" : "pendiente",
          garantia_cubre_repuesto: garantiaCubreRepuesto,
          solicitado_por: auth.user.id,
        });

      if (insertError) {
        // Si la policy RESTRICTIVE de RLS rechaza el insert
        // (usuario sin rol tecnico/supervisor), cae acá.
        throw insertError;
      }

      setNombre("");
      setCantidad("1");
      setValor("");

      await loadRepuestos();
    } catch (err) {
      console.error("Error creando solicitud de repuesto:", err);
      setFormError(
        err instanceof Error ? err.message : "No se pudo agregar el repuesto.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // =====================================================================
  // RENDER
  // =====================================================================

  return (
    <div className="space-y-4">
      {/* FORMULARIO (solo técnico/supervisor) */}
      {!checkingRol && puedeSolicitar && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-gray-100 p-3 space-y-2"
        >
          <h4 className="text-[13px] font-semibold text-gray-900">
            Solicitar repuesto
          </h4>

          <div className="grid grid-cols-3 gap-2">
            <input
              className="col-span-3 rounded-md border border-gray-200 px-2 py-1.5 text-[13px] sm:col-span-1"
              placeholder="Nombre del repuesto"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <input
              type="number"
              min={1}
              className="rounded-md border border-gray-200 px-2 py-1.5 text-[13px]"
              placeholder="Cantidad"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
            <input
              type="number"
              min={0}
              className="rounded-md border border-gray-200 px-2 py-1.5 text-[13px]"
              placeholder="Valor estimado"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>

          {formError && (
            <p className="text-[12px] text-rose-600">{formError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Agregar repuesto
          </button>
        </form>
      )}

      {/* AVISO PARA QUIEN NO PUEDE SOLICITAR */}
      {!checkingRol && !puedeSolicitar && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-[12px] text-gray-500">
          <Lock className="h-3.5 w-3.5" />
          Solo técnicos o supervisores pueden solicitar repuestos.
        </div>
      )}

      {/* LISTA DE REPUESTOS DE ESTA ORDEN */}
      <div>
        <h4 className="text-[13px] font-semibold text-gray-900 mb-2">
          Repuestos solicitados
        </h4>

        {loading && (
          <div className="flex items-center gap-2 text-[13px] text-gray-400 py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 text-[13px] text-rose-500 py-6 justify-center">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {!loading && !error && repuestos.length === 0 && (
          <div className="flex items-center gap-2 text-[13px] text-gray-400 py-6 justify-center">
            <Inbox className="h-4 w-4" />
            Aún no se han solicitado repuestos para esta orden.
          </div>
        )}

        {!loading && !error && repuestos.length > 0 && (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {repuestos.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between px-3 py-2 text-[13px]"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {r.nombre_repuesto}{" "}
                    <span className="text-gray-400">x{r.cantidad}</span>
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {formatCLP(r.valor)} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("es-CL")}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${ESTADO_STYLES[r.estado]}`}
                >
                  {ESTADO_LABELS[r.estado]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
