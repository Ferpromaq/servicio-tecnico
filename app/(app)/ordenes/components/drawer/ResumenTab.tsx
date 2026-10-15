import { Truck } from "lucide-react";
import type { OrdenDetalle } from "../../lib/types";
import EstadoBadge from "../EstadoBadge";

export default function ResumenTab({ orden }: { orden: OrdenDetalle }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Información General
        </h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm lg:grid-cols-3">
          <div>
            <div className="text-gray-400">Cliente</div>
            <div className="font-medium text-gray-900">
              {orden.cliente?.nombre_razon_social ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Teléfono</div>
            <div className="font-medium text-gray-900">
              {orden.cliente?.telefono ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Máquina</div>
            <div className="font-medium text-gray-900">
              {orden.maquina?.nombre ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Modelo</div>
            <div className="font-medium text-gray-900">
              {orden.maquina?.modelo ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-gray-400">N° Serie</div>
            <div className="font-medium text-gray-900">
              {orden.maquina?.numero_serie ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Fecha Ingreso</div>
            <div className="font-medium text-gray-900">
              {new Date(orden.created_at).toLocaleString("es-CL")}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Etapa actual</div>
            <div className="mt-1">
              <EstadoBadge estado={orden.estado} />
            </div>
          </div>
          <div>
            <div className="text-gray-400">Técnico Asignado</div>
            <div className="font-medium text-gray-900">
              {orden.tecnico?.nombre ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Garantía</div>
            <div className="font-medium text-gray-900">
              {orden.garantia_ingreso === true
                ? "Con garantía"
                : orden.garantia_ingreso === false
                  ? "Sin garantía"
                  : "—"}
            </div>
          </div>
        </div>

        {/*
          Aviso: la máquina ENTRÓ con garantía, pero el técnico
          determinó en el diagnóstico que este daño puntual no
          está cubierto. No reemplaza el campo "Garantía" de
          arriba (que sigue reflejando cómo entró la máquina),
          solo agrega contexto adicional del diagnóstico.
        */}
        {orden.garantia_ingreso === true &&
          orden.garantia_cubre_dano === false && (
            <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 ring-1 ring-inset ring-rose-600/20">
              <p className="text-xs font-semibold text-rose-600">
                Garantía no cubre este daño
              </p>
              <p className="text-xs text-rose-500 leading-relaxed">
                {orden.razon_no_cubre ?? "El técnico no especificó el motivo."}
              </p>
            </div>
          )}
      </section>

      {orden.entrega_forzada && orden.motivo_entrega_forzada && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Truck className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-amber-900">
                Motivo de entrega con pendientes
              </h3>

              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-amber-900">
                {orden.motivo_entrega_forzada}
              </p>

              {orden.entrega_marcada_por_usuario?.nombre && (
                <p className="mt-3 text-xs text-amber-700">
                  Registrado por: {orden.entrega_marcada_por_usuario.nombre}
                </p>
              )}

              {orden.entrega_marcada_en && (
                <p className="mt-3 text-xs text-amber-700">
                  Registrado el{" "}
                  {new Date(orden.entrega_marcada_en).toLocaleString("es-CL")}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">
          Descripción del Problema
        </h3>
        <p className="text-sm text-gray-600">
          {orden.descripcion_problema ?? "Sin descripción registrada."}
        </p>
      </section>
    </div>
  );
}
