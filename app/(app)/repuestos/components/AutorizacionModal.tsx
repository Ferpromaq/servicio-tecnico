"use client";

import { AlertCircle, X, ShieldCheck } from "lucide-react";
import { useState } from "react";

interface AutorizacionModalProps {
  repuestoId: string;
  repuestoNombre: string;
  accion: "autorizado" | "rechazado";
  onClose: () => void;
  onConfirmed: () => void | Promise<void>;
}

export default function AutorizacionModal({
  repuestoId,
  repuestoNombre,
  accion,
  onClose,
  onConfirmed,
}: AutorizacionModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [motivo, setMotivo] = useState("");

  const [clienteContactado, setClienteContactado] = useState<boolean | null>(
    null,
  );
  const [clienteContactadoPor, setClienteContactadoPor] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // TEXTOS Y ESTILOS SEGÚN LA ACCIÓN
  // ============================================================

  const accionLabel = accion === "autorizado" ? "Autorizar" : "Rechazar";

  const accionColor =
    accion === "autorizado"
      ? "bg-green-600 hover:bg-green-700"
      : "bg-red-600 hover:bg-red-700";

  // ============================================================
  // VALIDACIÓN
  // ============================================================

  const contactoValido =
    clienteContactado !== null &&
    (clienteContactado === false || clienteContactadoPor.trim().length > 0);

  const puedeConfirmar =
    email.trim().length > 0 &&
    password.length > 0 &&
    motivo.trim().length > 0 &&
    contactoValido;

  // ============================================================
  // CONFIRMAR
  // ============================================================

  async function handleConfirm() {
    if (!puedeConfirmar || submitting) return;

    if (clienteContactado === null) {
      setError("Debes indicar si el cliente fue contactado.");
      return;
    }

    if (clienteContactado === true && !clienteContactadoPor.trim()) {
      setError("Debes indicar quién contactó al cliente.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const ruta = "/repuestos/lib";

      console.log("🚀 Intentando conectar con:", ruta);

      console.log("📦 Datos enviados:", {
        repuestoId,
        accion,
        email: email.trim(),
        clienteContactado,
        clienteContactadoPor: clienteContactado
          ? clienteContactadoPor.trim()
          : null,
      });

      const res = await fetch(ruta, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repuestoId,
          accion,
          email: email.trim(),
          password,
          motivo: motivo.trim(),

          clienteContactado,
          clienteContactadoPor:
            clienteContactado === true ? clienteContactadoPor.trim() : null,
        }),
      });

      console.log("📡 Respuesta HTTP:", {
        status: res.status,
        ok: res.ok,
        statusText: res.statusText,
        url: res.url,
      });

      let json: any = null;

      try {
        json = await res.json();
      } catch (jsonError) {
        console.error(
          "❌ No se pudo convertir la respuesta a JSON:",
          jsonError,
        );
      }

      console.log("📨 Respuesta del servidor:", json);

      if (!res.ok) {
        const mensaje =
          json?.error ?? json?.detalle ?? "No se pudo procesar la solicitud.";

        console.error("❌ ERROR DE LA API:", {
          status: res.status,
          json,
        });

        setError(mensaje);
        setSubmitting(false);

        return;
      }

      console.log("✅ Repuesto procesado correctamente");

      await onConfirmed();
    } catch (error) {
      console.error("❌ ERROR DE CONEXIÓN:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Error de conexión. Intenta nuevamente.",
      );

      setSubmitting(false);
    }
  }

  // ============================================================
  // INTERFAZ
  // ============================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/60">
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-orange-500" />

            <h2 className="text-sm font-semibold text-white">
              Autorización requerida
            </h2>
          </div>

          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* ======================================================
            CONTENIDO
        ====================================================== */}

        <div className="space-y-4 px-5 py-4">
          {/* ====================================================
              DESCRIPCIÓN
          ==================================================== */}

          <p className="text-xs leading-relaxed text-slate-400">
            Vas a{" "}
            <span className="font-medium text-slate-200">
              {accionLabel.toLowerCase()}
            </span>{" "}
            <span className="font-medium text-slate-200">
              "{repuestoNombre}"
            </span>
            . Ingresa las credenciales de una cuenta con rol{" "}
            <span className="text-orange-400">admin</span> para confirmar.
          </p>

          {/* ====================================================
              CLIENTE CONTACTADO
          ==================================================== */}

          {/* ====================================================
    CLIENTE CONTACTADO
==================================================== */}

          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
            <div>
              <label className="block text-xs font-medium text-slate-200">
                ¿El cliente fue contactado?
                <span className="ml-1 text-red-400">*</span>
              </label>

              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                Debes indicar si el cliente fue contactado antes de autorizar o
                rechazar el repuesto.
              </p>
            </div>

            {/* ==================================================
      OPCIONES SÍ / NO
  ================================================== */}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setClienteContactado(true);
                }}
                disabled={submitting}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  clienteContactado === true
                    ? "border-green-500 bg-green-500/15 text-green-400"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-700"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Sí, fue contactado
              </button>

              <button
                type="button"
                onClick={() => {
                  setClienteContactado(false);
                  setClienteContactadoPor("");
                }}
                disabled={submitting}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  clienteContactado === false
                    ? "border-red-500 bg-red-500/15 text-red-400"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-700"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                No, no fue contactado
              </button>
            </div>

            {/* ==================================================
      MENSAJE SI TODAVÍA NO SE HA RESPONDIDO
  ================================================== */}

            {clienteContactado === null && (
              <p className="mt-2 text-[10px] font-medium text-orange-400">
                Debes seleccionar Sí o No para continuar.
              </p>
            )}

            {/* ==================================================
      QUIÉN CONTACTÓ
  ================================================== */}

            {clienteContactado === true && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  ¿Quién contactó al cliente?
                  <span className="ml-1 text-red-400">*</span>
                </label>

                <input
                  type="text"
                  value={clienteContactadoPor}
                  onChange={(e) => setClienteContactadoPor(e.target.value)}
                  autoComplete="off"
                  maxLength={150}
                  placeholder="Nombre de quien contactó al cliente"
                  disabled={submitting}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                />

                <p className="mt-1 text-[10px] text-slate-500">
                  Este nombre quedará registrado junto con la gestión del
                  repuesto.
                </p>
              </div>
            )}
          </div>

          {/* ====================================================
              EMAIL
          ==================================================== */}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Email admin
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              placeholder="admin@empresa.cl"
              disabled={submitting}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
            />
          </div>

          {/* ====================================================
              PASSWORD
          ==================================================== */}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Contraseña
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              disabled={submitting}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleConfirm();
                }
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
            />
          </div>

          {/* ====================================================
              MOTIVO
          ==================================================== */}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Motivo
            </label>

            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={submitting}
              rows={3}
              maxLength={500}
              placeholder={
                accion === "autorizado"
                  ? "Ej.: Repuesto necesario para reparar la máquina y el valor está dentro del presupuesto."
                  : "Ej.: El repuesto no corresponde a la falla diagnosticada."
              }
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
            />

            <div className="mt-1 text-right text-[10px] text-slate-600">
              {motivo.length}/500
            </div>
          </div>

          {/* ====================================================
              ERROR
          ==================================================== */}

          {error && (
            <div className="flex items-start gap-1.5 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-400">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />

              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ======================================================
            BOTONES
        ====================================================== */}

        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirm}
            disabled={!puedeConfirmar || submitting}
            className={`rounded-lg px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${accionColor}`}
          >
            {submitting ? "Verificando..." : `Confirmar ${accionLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
