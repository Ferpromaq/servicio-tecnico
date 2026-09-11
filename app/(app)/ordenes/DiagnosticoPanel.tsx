"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

interface DiagnosticoVersion {
  id: string;
  version: number;
  diagnostico: string;
  tecnico_nombre: string;
  created_at: string;
}

interface DiagnosticoPanelProps {
  ordenId: string;
  onUpdated?: (patch: {
    estado: string;
    diagnostico: string;
    garantia_cubre_dano: boolean | null;
    razon_no_cubre: string | null;
  }) => void;
}

export default function DiagnosticoPanel({
  ordenId,
  onUpdated,
}: DiagnosticoPanelProps) {
  const [historial, setHistorial] = useState<DiagnosticoVersion[] | null>(null);
  const [rolUsuario, setRolUsuario] = useState<string | null>(null);

  // Controla si se muestra el formulario de edición o la vista de
  // solo lectura del diagnóstico vigente. Si aún no hay ningún
  // diagnóstico registrado, el formulario se muestra directamente
  // (no tiene sentido pedir "Nuevo diagnóstico" cuando no hay ninguno).
  const [modoEdicion, setModoEdicion] = useState(false);

  const [texto, setTexto] = useState("");
  const [garantiaCubreDano, setGarantiaCubreDano] = useState<boolean | null>(
    null,
  );
  const [razonNoCubre, setRazonNoCubre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistorial = useCallback(async () => {
    const { data } = await supabase
      .from("diagnosticos_historial")
      .select("id, version, diagnostico, tecnico_nombre, created_at")
      .eq("orden_id", ordenId)
      .order("version", { ascending: false });
    setHistorial((data as DiagnosticoVersion[]) ?? []);
  }, [ordenId]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  useEffect(() => {
    async function loadRol() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", user.id) // usuarios.id === auth.users.id
        .single();

      setRolUsuario(data?.rol ?? null);
    }
    loadRol();
  }, []);

  const puedeEditar = rolUsuario === "tecnico" || rolUsuario === "admin";
  const ultimaVersion = historial?.[0] ?? null;

  // Limpia el formulario y lo deja listo para registrar una nueva
  // versión desde cero (no precargado con la anterior).
  function abrirFormularioNuevo() {
    setTexto("");
    setGarantiaCubreDano(null);
    setRazonNoCubre("");
    setError(null);
    setModoEdicion(true);
  }

  function cancelarEdicion() {
    setTexto("");
    setGarantiaCubreDano(null);
    setRazonNoCubre("");
    setError(null);
    setModoEdicion(false);
  }

  async function handleGuardar() {
    const textoLimpio = texto.trim();
    if (!textoLimpio) return;

    // No permitir guardar si el texto es idéntico al diagnóstico vigente
    if (ultimaVersion && textoLimpio === ultimaVersion.diagnostico.trim()) {
      setError("El diagnóstico no tiene cambios respecto a la versión actual.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/ordenes/${ordenId}/diagnostico`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnostico: textoLimpio,
          garantia_cubre_dano: garantiaCubreDano,
          razon_no_cubre:
            garantiaCubreDano === false ? razonNoCubre.trim() : null,
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();

      console.log("STATUS:", res.status);
      console.log("CONTENT-TYPE:", contentType);
      console.log("RESPUESTA API:", raw);

      let json: any = null;

      if (contentType.includes("application/json")) {
        try {
          json = JSON.parse(raw);
        } catch {
          setError("La API respondió JSON inválido.");
          return;
        }
      } else {
        setError(
          `La API respondió algo inesperado (${res.status}). Revisa la consola y route.ts.`,
        );
        return;
      }

      if (!res.ok) {
        setError(json?.error ?? "No se pudo guardar el diagnóstico.");
        return;
      }

      await fetchHistorial();

      // Diagnóstico guardado: volvemos a la vista de solo lectura.
      setTexto("");
      setGarantiaCubreDano(null);
      setRazonNoCubre("");
      setModoEdicion(false);
    } catch (e) {
      setError("Error de red al guardar el diagnóstico.");
    } finally {
      setSaving(false);
    }
  }

  const mostrarFormulario = puedeEditar && (modoEdicion || !ultimaVersion);

  return (
    <div className="space-y-5">
      {/* =================================================================
          VISTA DE SOLO LECTURA
          ================================================================= 
          Se muestra cuando ya existe un diagnóstico vigente y el usuario
          no está en modo edición. Reemplaza al formulario precargado que
          antes se mostraba siempre por defecto.
      ================================================================== */}
      {puedeEditar && !modoEdicion && ultimaVersion && (
        <section className="rounded-lg border border-gray-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">
              Diagnóstico actual
            </h4>

            <button
              type="button"
              onClick={abrirFormularioNuevo}
              className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700"
            >
              + Nuevo diagnóstico
            </button>
          </div>

          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {ultimaVersion.diagnostico}
          </p>

          <p className="mt-2 text-[11px] text-gray-400">
            Versión {ultimaVersion.version} · Registrado por{" "}
            {ultimaVersion.tecnico_nombre} ·{" "}
            {new Date(ultimaVersion.created_at).toLocaleString("es-CL")}
          </p>
        </section>
      )}

      {/* =================================================================
          FORMULARIO
          ================================================================= 
          Se muestra si aún no hay ningún diagnóstico (primer registro) o
          si el usuario hizo click en "+ Nuevo diagnóstico". Siempre
          arranca vacío, nunca precargado con la versión anterior.
      ================================================================== */}
      {mostrarFormulario && (
        <section className="rounded-lg border border-gray-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">
              {ultimaVersion ? "Nuevo diagnóstico" : "Registrar diagnóstico"}
            </h4>

            {ultimaVersion && (
              <button
                type="button"
                onClick={cancelarEdicion}
                className="text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
            )}
          </div>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder="Describe el diagnóstico de la máquina..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-900">
              ¿El daño está cubierto por garantía?
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setGarantiaCubreDano(true);
                  setRazonNoCubre("");
                }}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  garantiaCubreDano === true
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Sí, cubre
              </button>

              <button
                type="button"
                onClick={() => setGarantiaCubreDano(false)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  garantiaCubreDano === false
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                No cubre
              </button>

              <button
                type="button"
                onClick={() => {
                  setGarantiaCubreDano(null);
                  setRazonNoCubre("");
                }}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  garantiaCubreDano === null
                    ? "border-gray-500 bg-gray-50 text-gray-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                No determinado
              </button>
            </div>
          </div>
          {garantiaCubreDano === false && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Razón por la que no cubre la garantía
              </label>

              <textarea
                value={razonNoCubre}
                onChange={(e) => setRazonNoCubre(e.target.value)}
                rows={3}
                placeholder="Indica por qué el daño no está cubierto por garantía..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          )}
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          {ultimaVersion &&
            texto.trim() !== "" &&
            texto.trim() === ultimaVersion.diagnostico.trim() && (
              <p className="mt-1 text-xs text-orange-400">
                Sin cambios respecto al diagnóstico actual.
              </p>
            )}
          <div className="mt-2 flex items-center justify-between">
            {ultimaVersion && (
              <span className="text-[11px] text-gray-400">
                Se guardará como una nueva versión; la anterior queda en el
                historial.
              </span>
            )}
            <button
              onClick={handleGuardar}
              disabled={
                saving ||
                !texto.trim() ||
                garantiaCubreDano === null ||
                (garantiaCubreDano === false && !razonNoCubre.trim()) ||
                (ultimaVersion !== null &&
                  texto.trim() === ultimaVersion.diagnostico.trim())
              }
              className="ml-auto rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Guardando..."
                : ultimaVersion
                  ? "Guardar nuevo diagnóstico"
                  : "Guardar diagnóstico"}
            </button>
          </div>
        </section>
      )}

      <section>
        <h4 className="mb-2 text-sm font-semibold text-gray-900">
          Historial de diagnósticos
        </h4>

        {historial === null && (
          <p className="text-sm text-gray-400">Cargando historial...</p>
        )}

        {historial !== null && historial.length === 0 && (
          <p className="text-sm text-gray-400">
            Aún no se ha registrado un diagnóstico.
          </p>
        )}

        <div className="space-y-3">
          {historial?.map((h, i) => (
            <div
              key={h.id}
              className="rounded-lg border border-gray-200 p-3 text-sm"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-900">
                  Versión {h.version}{" "}
                  {i === 0 && (
                    <span className="ml-1 rounded-md bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                      Actual
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-gray-400">
                  {new Date(h.created_at).toLocaleString("es-CL")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-gray-700">
                {h.diagnostico}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">
                Registrado por {h.tecnico_nombre}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}