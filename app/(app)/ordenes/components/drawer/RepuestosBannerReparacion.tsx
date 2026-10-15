import type { AutorizarReparacionState } from "../../hooks/useAutorizarReparacion";

export default function RepuestosBannerReparacion({
  totalRepuestos,
  repuestosRecibidos,
  reparacion,
}: {
  totalRepuestos: number;
  repuestosRecibidos: number;
  reparacion: AutorizarReparacionState;
}) {
  const { abrirAutorizacionReparacion, autorizandoReparacion } = reparacion;

  return (
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
            El administrador puede autorizar el inicio de la reparación aunque
            existan repuestos pendientes.
          </p>
        </div>

        {/* 👇 AQUÍ VA EL BOTÓN */}
        {totalRepuestos > 0 && repuestosRecibidos === totalRepuestos && (
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
  );
}
