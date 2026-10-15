import { AlertTriangle, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import type { AccesoAdminRepuestosState } from "../../hooks/useAccesoAdminRepuestos";

// Aviso + formulario de autorización administrativa cuando la máquina
// ya está lista para entrega y se quieren solicitar más repuestos.
export default function AccesoAdminRepuestos({
  acceso,
}: {
  acceso: AccesoAdminRepuestosState;
}) {
  const {
    mostrarAccesoAdminRepuestos,
    setMostrarAccesoAdminRepuestos,
    usuarioAdminRepuestos,
    setUsuarioAdminRepuestos,
    passwordAdminRepuestos,
    setPasswordAdminRepuestos,
    validandoAdminRepuestos,
    errorAdminRepuestos,
    setErrorAdminRepuestos,
    validarAdminYHabilitarRepuestos,
  } = acceso;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-5 w-5 text-amber-700" />
        </div>

        <div className="min-w-0">
          <h3 className="font-semibold text-amber-900">
            Máquina lista para entrega
          </h3>

          <p className="mt-1 text-sm text-amber-800">
            Esta orden ya está marcada como lista para entrega. Para solicitar
            repuestos adicionales, necesitas una autorización de un
            administrador.
          </p>
        </div>
      </div>

      {!mostrarAccesoAdminRepuestos ? (
        <button
          type="button"
          onClick={() => {
            setMostrarAccesoAdminRepuestos(true);
            setErrorAdminRepuestos("");
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700"
        >
          <LockKeyhole className="h-4 w-4" />
          Solicitar autorización administrativa
        </button>
      ) : (
        <form
          onSubmit={validarAdminYHabilitarRepuestos}
          className="space-y-3 border-t border-amber-200 pt-4"
        >
          <div>
            <label
              htmlFor="usuario-admin-repuestos"
              className="mb-1 block text-sm font-medium text-amber-950"
            >
              Usuario o correo del administrador
            </label>

            <input
              id="usuario-admin-repuestos"
              type="text"
              autoComplete="username"
              value={usuarioAdminRepuestos}
              onChange={(e) => setUsuarioAdminRepuestos(e.target.value)}
              placeholder="Ingresa el usuario o correo"
              required
              disabled={validandoAdminRepuestos}
              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="password-admin-repuestos"
              className="mb-1 block text-sm font-medium text-amber-950"
            >
              Contraseña del administrador
            </label>

            <input
              id="password-admin-repuestos"
              type="password"
              autoComplete="current-password"
              value={passwordAdminRepuestos}
              onChange={(e) => setPasswordAdminRepuestos(e.target.value)}
              placeholder="Ingresa la contraseña"
              required
              disabled={validandoAdminRepuestos}
              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
            />
          </div>

          {errorAdminRepuestos && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {errorAdminRepuestos}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setMostrarAccesoAdminRepuestos(false);
                setUsuarioAdminRepuestos("");
                setPasswordAdminRepuestos("");
                setErrorAdminRepuestos("");
              }}
              disabled={validandoAdminRepuestos}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={validandoAdminRepuestos}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {validandoAdminRepuestos ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validando autorización...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Autorizar solicitud
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
