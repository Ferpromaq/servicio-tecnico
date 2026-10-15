import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { Eye, PackageCheck, Wrench } from "lucide-react";
import type {
  EstadoRepuesto,
  MotivoModalState,
  RepuestoItem,
} from "../../lib/types";
import { formatFechaHora } from "../../lib/utils";
import EstadoRepuestoBadge from "../EstadoRepuestoBadge";

export default function RepuestoCard({
  r,
  enCurso,
  isAdmin,
  setMotivoModal,
  marcarRecibido,
  marcarInstalado,
}: {
  r: RepuestoItem;
  enCurso: boolean;
  isAdmin: boolean;
  setMotivoModal: Dispatch<SetStateAction<MotivoModalState | null>>;
  marcarRecibido: (repuestoId: string) => void;
  marcarInstalado: (repuestoId: string) => void;
}) {
  return (
    <Link
      href={`/repuestos?repuestosTab=${r.estado}&repuesto=${r.id}`}
      className="block rounded-lg border border-gray-200 p-3 text-sm transition hover:border-gray-300 hover:bg-gray-50"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="font-medium text-gray-900">{r.nombre_repuesto}</div>

          <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
            <span>Cantidad: {r.cantidad}</span>

            <EstadoRepuestoBadge estado={r.estado as EstadoRepuesto} />

            {r.estado === "autorizado" && r.autorizado_en && (
              <span className="text-[10px] text-gray-400">
                Gestionado por{" "}
                <span className="font-medium text-gray-600">
                  {r.autorizado_por_usuario?.nombre ?? "Usuario desconocido"}
                </span>
                {" · "}
                {new Date(r.autorizado_en).toLocaleString("es-CL", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}

            {r.estado === "rechazado" && r.rechazado_en && (
              <span className="text-[10px] text-gray-400">
                Gestionado por{" "}
                <span className="font-medium text-gray-600">
                  {r.rechazado_por_usuario?.nombre ?? "Usuario desconocido"}
                </span>
                {" · "}
                {new Date(r.rechazado_en).toLocaleString("es-CL", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}

            {r.estado === "autorizado" && r.motivo_autorizacion && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setMotivoModal({
                    tipo: "autorizado",
                    motivo: r.motivo_autorizacion!,
                    repuestoNombre: r.nombre_repuesto,
                  });
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                title="Ver motivo de autorización"
                aria-label="Ver motivo de autorización"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}

            {r.estado === "rechazado" && r.motivo_rechazo && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setMotivoModal({
                    tipo: "rechazado",
                    motivo: r.motivo_rechazo!,
                    repuestoNombre: r.nombre_repuesto,
                  });
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition hover:bg-rose-50 hover:text-rose-600"
                title="Ver motivo del rechazo"
                aria-label="Ver motivo del rechazo"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* =====================================
              RECIBIDO / INSTALADO
              Solo aplica a repuestos autorizados.
              Los botones cortan la navegación del
              Link (preventDefault + stopPropagation)
              igual que los íconos de "ver motivo".
          ===================================== */}
          {r.estado === "comprado" && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              {/* =====================================================
                  RECIBIDO
              ===================================================== */}
              {r.recibido ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-slate-600 ring-1 ring-inset ring-slate-200">
                  <PackageCheck className="h-3 w-3 text-emerald-600" />

                  <span>Recibido {formatFechaHora(r.recibido_en)}</span>

                  {r.recibido_por_usuario?.nombre && (
                    <span>· {r.recibido_por_usuario.nombre}</span>
                  )}
                </span>
              ) : isAdmin ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    marcarRecibido(r.id);
                  }}
                  disabled={enCurso}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 font-medium text-gray-600 ring-1 ring-inset ring-gray-200 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PackageCheck className="h-3 w-3" />

                  {enCurso ? "Guardando..." : "Marcar recibido"}
                </button>
              ) : (
                <span className="text-gray-400">Aún no llega</span>
              )}

              {/* =====================================================
                  INSTALADO
                  Solo puede existir si primero fue recibido.
              ===================================================== */}
              {r.recibido &&
                (r.instalado ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-slate-600 ring-1 ring-inset ring-slate-200">
                    <Wrench className="h-3 w-3 text-emerald-600" />

                    <span>Instalado {formatFechaHora(r.instalado_en)}</span>

                    {r.instalado_por_usuario?.nombre && (
                      <span>· {r.instalado_por_usuario.nombre}</span>
                    )}
                  </span>
                ) : isAdmin ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      marcarInstalado(r.id);
                    }}
                    disabled={enCurso}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-white px-2 py-1 font-medium text-gray-600 ring-1 ring-inset ring-gray-200 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Wrench className="h-3 w-3" />

                    {enCurso ? "Guardando..." : "Marcar instalado"}
                  </button>
                ) : (
                  <span className="text-gray-400">Pendiente de instalar</span>
                ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
