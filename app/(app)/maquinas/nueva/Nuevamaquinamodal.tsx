"use client";

/**
 * NuevaMaquinaModal
 * ---------------------------------------------------------------
 * Mismo lenguaje visual que NuevaOrdenModal (header oscuro, footer
 * fijo, pantalla de éxito). A diferencia de ese modal, aquí NO separé
 * en hooks/ y components/ porque no conozco tu estructura de carpetas
 * real para el módulo de máquinas (¿tiene su propio hooks/components,
 * o reutiliza algo compartido?). Todo vive en un solo archivo por
 * ahora — si quieres, en un siguiente paso lo descompongo igual que
 * NuevaOrdenModal una vez definamos dónde viven los hooks compartidos
 * (ej: useClienteSelection podría moverse a algo como
 * app/(app)/shared/hooks/ para reusarlo aquí sin importar cruzado
 * desde el módulo de ordenes).
 *
 * AJUSTES QUE DEBES REVISAR ANTES DE USAR:
 *  1. El campo "Tipo" es un input de texto libre porque no conozco los
 *     valores del enum `tipo_maquina`. Cámbialo por un <select> con las
 *     opciones reales apenas me las pases (igual que hicimos con
 *     `estado_maquina`).
 *  2. El buscador de cliente es opcional (una máquina puede crearse sin
 *     cliente asignado, como vimos con "FERPROMAQ SPA"). Ajusta si
 *     quieres hacerlo obligatorio.
 *  3. Uso `supabase.from("maquinas").insert(...)`, asumiendo que RLS
 *     permite INSERT al usuario autenticado.
 * ---------------------------------------------------------------
 */

import { AlertCircle, X, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

const supabase = createClient();

interface NuevaMaquinaModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}

interface ClienteOption {
  id: string;
  nombre_razon_social: string;
}

const ESTADO_OPTIONS = [
  { value: "operativa", label: "Operativa" },
  { value: "en_mantencion", label: "En Mantención" },
  { value: "fuera_servicio", label: "Fuera de Servicio" },
];

export default function NuevaMaquinaModal({
  open,
  onClose,
  onCreated,
}: NuevaMaquinaModalProps) {
  // -----------------------------------------------------------------
  // Campos del formulario
  // -----------------------------------------------------------------
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [estado, setEstado] = useState("operativa");

  // -----------------------------------------------------------------
  // Selección de cliente (opcional) — mismo patrón de búsqueda que el
  // combobox del drawer de edición.
  // -----------------------------------------------------------------
  const [cliente, setCliente] = useState<ClienteOption | null>(null);
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteResults, setClienteResults] = useState<ClienteOption[]>([]);
  const [searchingClientes, setSearchingClientes] = useState(false);

  useEffect(() => {
    const q = clienteQuery.trim();
    if (q.length < 2) {
      setClienteResults([]);
      return;
    }
    setSearchingClientes(true);
    const timer = window.setTimeout(async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nombre_razon_social")
        .ilike("nombre_razon_social", `%${q}%`)
        .limit(8);
      setClienteResults((data as unknown as ClienteOption[]) ?? []);
      setSearchingClientes(false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [clienteQuery]);

  // -----------------------------------------------------------------
  // Envío
  // -----------------------------------------------------------------
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const puedeCrear = nombre.trim().length > 0 && tipo.trim().length > 0;

  function resetAll() {
    setNombre("");
    setTipo("");
    setMarca("");
    setModelo("");
    setNumeroSerie("");
    setEstado("operativa");
    setCliente(null);
    setClienteQuery("");
    setClienteResults([]);
    setSubmitting(false);
    setDone(false);
    setError(null);
  }

  function handleClose() {
    onClose();
    setTimeout(resetAll, 200);
  }

  async function handleSubmit() {
    if (!puedeCrear) return;
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("maquinas").insert({
      nombre: nombre.trim(),
      tipo: tipo.trim(),
      marca: marca.trim() || null,
      modelo: modelo.trim() || null,
      numero_serie: numeroSerie.trim() || null,
      estado,
      cliente_id: cliente?.id ?? null,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setDone(true);
    await onCreated();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Nueva Máquina</h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {done ? (
          // -------------------------------------------------------
          // Pantalla de éxito
          // -------------------------------------------------------
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 size={26} className="text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                Máquina creada
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {nombre}
                {cliente ? ` · ${cliente.nombre_razon_social}` : ""}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="mt-2 rounded-lg bg-orange-600 px-4 py-2 text-xs font-medium text-white hover:bg-orange-700"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Nombre *
                </label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Betonera"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Tipo *
                </label>
                <input
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  placeholder="Ej: hormigon"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Debe coincidir con un valor del enum{" "}
                  <code className="text-slate-400">tipo_maquina</code>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Marca
                  </label>
                  <input
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Modelo
                  </label>
                  <input
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  N° Serie
                </label>
                <input
                  value={numeroSerie}
                  onChange={(e) => setNumeroSerie(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Estado
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {ESTADO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Cliente (opcional)
                </label>
                {cliente ? (
                  <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm">
                    <span className="text-white">
                      {cliente.nombre_razon_social}
                    </span>
                    <button
                      onClick={() => setCliente(null)}
                      className="text-xs text-slate-400 hover:text-red-400"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <input
                    value={clienteQuery}
                    onChange={(e) => setClienteQuery(e.target.value)}
                    placeholder="Buscar cliente por nombre..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                )}

                {!cliente && clienteQuery.trim().length >= 2 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 shadow-lg">
                    {searchingClientes && (
                      <div className="px-3 py-2 text-xs text-slate-400">
                        Buscando...
                      </div>
                    )}
                    {!searchingClientes && clienteResults.length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-400">
                        Sin resultados.
                      </div>
                    )}
                    {clienteResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setCliente(c);
                          setClienteQuery("");
                          setClienteResults([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700"
                      >
                        {c.nombre_razon_social}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <p className="flex items-start gap-1.5 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-400">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-5 py-4">
              <button
                onClick={handleClose}
                disabled={submitting}
                className="rounded-lg px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!puedeCrear || submitting}
                className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Creando..." : "Crear Máquina"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}