import type { AutorizarReparacionState } from "../../hooks/useAutorizarReparacion";

export default function AutorizarReparacionModal({
  numeroOrden,
  repuestosRecibidos,
  totalRepuestos,
  reparacion,
}: {
  numeroOrden: string | undefined;
  repuestosRecibidos: number;
  totalRepuestos: number;
  reparacion: AutorizarReparacionState;
}) {
  const {
    setAutorizarReparacionModal,
    emailAdmin,
    setEmailAdmin,
    passwordAdmin,
    setPasswordAdmin,
    motivoReparacion,
    setMotivoReparacion,
    autorizandoReparacion,
    errorAutorizacionReparacion,
    confirmarPasoAReparacion,
  } = reparacion;

  return (
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
              <span className="font-semibold">{numeroOrden}</span> de{" "}
              <strong>Esperando Repuestos</strong> a{" "}
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
  );
}
