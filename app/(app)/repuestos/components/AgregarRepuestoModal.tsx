"use client";

import { useEffect, useState } from "react";
import { X, Search, Loader2, Package, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

const supabase = createClient();

interface OrdenOpcion {
  id: string;
  numero_orden: string;
  estado: string;
  cliente: { nombre_razon_social: string } | null;
}

type Props =
  | {
      mode: "crear";
      onClose: () => void;
      onSaved: () => void | Promise<void>;
    }
  | {
      mode: "asignar";
      repuestoId: string;
      repuestoNombre: string;
      onClose: () => void;
      onSaved: () => void | Promise<void>;
    };

export default function AgregarRepuestoModal(props: Props) {
  const { mode, onClose, onSaved } = props;

  // Formulario (solo modo crear)
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [valor, setValor] = useState("");
  const [asignarAhora, setAsignarAhora] = useState(mode === "asignar");

  // Selector de orden
  const [busqueda, setBusqueda] = useState("");
  const [ordenes, setOrdenes] = useState<OrdenOpcion[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [ordenSel, setOrdenSel] = useState<OrdenOpcion | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mostrarSelectorOrden = mode === "asignar" || asignarAhora;

  // Buscar órdenes (con debounce)
  useEffect(() => {
    if (!mostrarSelectorOrden) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setBuscando(true);

      let query = supabase
        .from("ordenes_servicio")
        .select("id, numero_orden, estado, cliente:clientes(nombre_razon_social)")
        .order("created_at", { ascending: false })
        .limit(10);

      if (busqueda.trim()) {
        query = query.ilike("numero_orden", `%${busqueda.trim()}%`);
      }

      const { data, error: err } = await query;

      if (cancelled) return;

      if (err) {
        console.error("Error buscando órdenes:", err);
        setOrdenes([]);
      } else {
        setOrdenes((data as unknown as OrdenOpcion[]) ?? []);
      }

      setBuscando(false);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [busqueda, mostrarSelectorOrden]);

  async function handleGuardar() {
    setError(null);

    try {
      // Validaciones
      if (mode === "crear") {
        if (!nombre.trim()) throw new Error("Ingresa el nombre del repuesto.");
        if (!(Number(cantidad) >= 1)) throw new Error("La cantidad debe ser al menos 1.");
        if (valor === "" || Number(valor) < 0) throw new Error("Ingresa un valor válido.");
      }

      if (mostrarSelectorOrden && !ordenSel) {
        throw new Error("Selecciona una orden de servicio.");
      }

      setGuardando(true);

      if (props.mode === "asignar") {
        // Asignar un repuesto de stock existente a una orden
        const { error: updateError } = await supabase
          .from("repuestos_solicitados")
          .update({
            origen_tipo: "orden_servicio",
            origen_id: ordenSel!.id,
          })
          .eq("id", props.repuestoId)
          .eq("desde_stock", true)
          .is("origen_id", null);

        if (updateError) throw updateError;
      } else {
        // Crear repuesto de stock
        const { data: auth, error: authError } = await supabase.auth.getUser();

        if (authError || !auth.user) {
          throw new Error("No se pudo identificar al usuario actual.");
        }

        const ahora = new Date().toISOString();

        const { error: insertError } = await supabase
          .from("repuestos_solicitados")
          .insert({
            origen_tipo: ordenSel ? "orden_servicio" : "stock",
            origen_id: ordenSel ? ordenSel.id : null,
            nombre_repuesto: nombre.trim(),
            cantidad: Number(cantidad),
            valor: Number(valor),

            desde_stock: true,
            estado: "comprado",
            auditoria_requerida: false,
            garantia_cubre_repuesto: false,
            cliente_contactado: false,

            solicitado_por: auth.user.id,

            // Ya está en la empresa: queda recibido
            recibido: true,
            recibido_por: auth.user.id,
            recibido_en: ahora,

            instalado: false,
          });

        if (insertError) throw insertError;
      }

      await onSaved();
    } catch (e) {
      console.error("Error guardando repuesto:", e);
      setError(
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e
            ? String((e as { message: unknown }).message)
            : "No se pudo guardar el repuesto.",
      );
      setGuardando(false);
    }
  }

  const titulo =
    mode === "crear" ? "Agregar repuesto de stock" : "Asignar a orden de servicio";

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[2px]"
      onClick={guardando ? undefined : onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              {mode === "crear" ? (
                <Package className="h-4 w-4" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-900">{titulo}</h3>
              {props.mode === "asignar" && (
                <p className="text-[10px] text-gray-400">{props.repuestoNombre}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="space-y-4 overflow-y-auto px-4 py-4 text-xs">
          {mode === "crear" && (
            <>
              <div>
                <label className="mb-1 block font-medium text-gray-600">
                  Nombre del repuesto
                </label>
                <input
                  className={inputClass}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Rodamiento 6204"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-gray-600">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium text-gray-600">
                    Valor unitario (CLP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    checked={!asignarAhora}
                    onChange={() => {
                      setAsignarAhora(false);
                      setOrdenSel(null);
                    }}
                  />
                  <span className="text-gray-700">
                    Dejar en stock, <b>sin asignar</b> (asignar después)
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    checked={asignarAhora}
                    onChange={() => setAsignarAhora(true)}
                  />
                  <span className="text-gray-700">Asignar a una orden de servicio ahora</span>
                </label>
              </div>
            </>
          )}

          {mostrarSelectorOrden && (
            <div>
              <label className="mb-1 block font-medium text-gray-600">Orden de servicio</label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  className={`${inputClass} pl-8`}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por número de orden..."
                />
              </div>

              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                {buscando ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando...
                  </div>
                ) : ordenes.length === 0 ? (
                  <div className="py-6 text-center text-gray-400">
                    No se encontraron órdenes.
                  </div>
                ) : (
                  ordenes.map((o) => {
                    const seleccionada = ordenSel?.id === o.id;

                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setOrdenSel(o)}
                        className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 ${
                          seleccionada ? "bg-amber-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900">{o.numero_orden}</div>
                          <div className="truncate text-[10px] text-gray-400">
                            {o.cliente?.nombre_razon_social ?? "—"}
                          </div>
                        </div>

                        <span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {o.estado}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
              {error}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-slate-200 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mode === "crear" ? "Agregar repuesto" : "Asignar"}
          </button>
        </div>
      </div>
    </div>
  );
}