"use client";

import { useEffect, useState } from "react";
import {
  X,
  Package,
  UserRound,
  CalendarDays,
  Wrench,
  ShieldCheck,
  CircleDollarSign,
  ClipboardList,
} from "lucide-react";

type RepuestoDrawerProps = {
  repuesto: any;
  onClose: () => void;
  usuariosById?: Record<string, any>;
  maquinasById?: Record<string, any>;
};

export default function RepuestoDrawer({
  repuesto,
  onClose,
  usuariosById = {},
  maquinasById = {},
}: RepuestoDrawerProps) {
  const [visible, setVisible] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function cerrar() {
    if (cerrando) return;

    setCerrando(true);
    setVisible(false);
    setTimeout(onClose, 250);
  }

  if (!repuesto) return null;

  const r = repuesto;
  const maquina = r.maquina ?? maquinasById[r.maquina_id];

  const usuario = (id: any, relacionado?: any) =>
    relacionado?.nombre ??
    usuariosById[id]?.nombre ??
    (id ? "Usuario registrado" : "—");

  const fecha = (valor: any) =>
    valor
      ? new Date(valor).toLocaleString("es-CL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const dinero = (valor: any) =>
    valor != null
      ? Number(valor).toLocaleString("es-CL", {
          style: "currency",
          currency: "CLP",
          maximumFractionDigits: 0,
        })
      : "—";

  const siNo = (valor: any) =>
    valor === true ? "Sí" : valor === false ? "No" : "Sin registrar";

  const estadoColor: Record<string, string> = {
    pendiente: "bg-amber-50 text-amber-700 ring-amber-200",
    autorizado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    comprado: "bg-blue-50 text-blue-700 ring-blue-200",
    rechazado: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  function Seccion({
    titulo,
    icono,
    children,
    className = "",
  }: {
    titulo: string;
    icono: React.ReactNode;
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <section
        className={`mb-3 break-inside-avoid min-w-0 rounded-xl border border-gray-200 bg-white p-3 sm:p-4 ${className}`}
      >
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <span className="text-orange-600">{icono}</span>
          {titulo}
        </h3>
        <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          {children}
        </div>
      </section>
    );
  }

  function Campo({
    etiqueta,
    valor,
    completo = false,
  }: {
    etiqueta: string;
    valor: React.ReactNode;
    completo?: boolean;
  }) {
    return (
      <div className={`min-w-0 ${completo ? "sm:col-span-2" : ""}`}>
        <div className="mb-1 text-[11px] text-gray-400">{etiqueta}</div>
        <div className="break-words whitespace-pre-wrap text-sm font-medium leading-relaxed text-gray-800">
          {valor ?? "—"}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Overlay animado */}
      <div
        className={`fixed inset-0 z-[60] bg-slate-950/30 backdrop-blur-[1px] transition-opacity duration-250 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={cerrar}
        aria-hidden="true"
      />

      {/* Drawer lateral */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del repuesto"
        className={`fixed inset-y-0 right-0 z-[70] flex min-w-310 flex-col bg-gray-50 shadow-2xl transition-transform duration-250 ease-out sm:max-w-xl lg:max-w-3xl xl:max-w-4xl ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Encabezado */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Package className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Detalle del repuesto
              </p>
              <h2 className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                {r.nombre_repuesto || "Repuesto sin nombre"}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Cantidad: {r.cantidad ?? "—"} · {dinero(r.valor)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`hidden rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset sm:inline-flex ${
                estadoColor[r.estado] ??
                "bg-gray-100 text-gray-600 ring-gray-200"
              }`}
            >
              {r.estado
                ? r.estado
                    .replaceAll("_", " ")
                    .replace(/^./, (c: string) => c.toUpperCase())
                : "Sin estado"}
            </span>

            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar detalle"
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Contenido desplazable */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="columns-1 gap-3 sm:columns-2 xl:columns-3">
            <Seccion
              titulo="Información general"
              icono={<ClipboardList className="h-4 w-4" />}
            >
              <Campo etiqueta="Nombre" valor={r.nombre_repuesto} completo />
              <Campo etiqueta="Cantidad" valor={r.cantidad} />
              <Campo etiqueta="Valor unitario" valor={dinero(r.valor)} />
              <Campo
                etiqueta="Fecha de solicitud"
                valor={fecha(r.created_at)}
              />
              <Campo
                etiqueta="Auditoría requerida"
                valor={siNo(r.auditoria_requerida)}
              />
              <Campo etiqueta="Estado" valor={r.estado ?? "—"} />
            </Seccion>

            <Seccion
              titulo="Cliente y garantía"
              icono={<ShieldCheck className="h-4 w-4" />}
            >
              <Campo
                etiqueta="Garantía cubre el repuesto"
                valor={siNo(r.garantia_cubre_repuesto)}
              />
              <Campo
                etiqueta="Cliente contactado"
                valor={siNo(r.cliente_contactado)}
              />
              <Campo
                etiqueta="Contactado por"
                valor={usuario(r.cliente_contactado_por)}
                completo
              />
            </Seccion>

            <Seccion
              titulo="Registro"
              icono={<CalendarDays className="h-4 w-4" />}
            >
              <Campo etiqueta="Creado" valor={fecha(r.created_at)} />
              <Campo
                etiqueta="Última actualización"
                valor={fecha(r.updated_at)}
              />
            </Seccion>

            <Seccion
              titulo="Solicitud y origen"
              icono={<UserRound className="h-4 w-4" />}
            >
              <Campo
                etiqueta="Solicitado por"
                valor={usuario(r.solicitado_por, r.solicitado_por_usuario)}
              />
              <Campo
                etiqueta="Tipo de origen"
                valor={
                  r.desde_stock && !r.origen_id
                    ? "Stock sin asignar"
                    : (r.origen_tipo ?? "—")
                }
              />
              <Campo etiqueta="ID de origen" valor={r.origen_id} completo />
              {maquina && (
                <>
                  <Campo etiqueta="Máquina" valor={maquina.nombre} />
                  <Campo etiqueta="Marca" valor={maquina.marca} />
                  <Campo etiqueta="Modelo" valor={maquina.modelo} />
                  <Campo etiqueta="N.º de serie" valor={maquina.numero_serie} />
                  <Campo
                    etiqueta="ID de máquina"
                    valor={r.maquina_id}
                    completo
                  />
                </>
              )}
            </Seccion>

            <Seccion titulo="Recepción" icono={<Package className="h-4 w-4" />}>
              <Campo etiqueta="Recibido" valor={siNo(r.recibido)} />
              <Campo
                etiqueta="Recibido por"
                valor={usuario(r.recibido_por, r.recibido_por_usuario)}
              />
              <Campo
                etiqueta="Fecha de recepción"
                valor={fecha(r.recibido_en)}
                completo
              />
            </Seccion>

            <Seccion
              titulo="Instalación"
              icono={<Wrench className="h-4 w-4" />}
            >
              <Campo etiqueta="Instalado" valor={siNo(r.instalado)} />
              <Campo
                etiqueta="Instalado por"
                valor={usuario(r.instalado_por, r.instalado_por_usuario)}
              />
              <Campo
                etiqueta="Fecha de instalación"
                valor={fecha(r.instalado_en)}
                completo
              />
            </Seccion>

            <Seccion
              titulo="Autorización"
              icono={<ShieldCheck className="h-4 w-4" />}
            >
              <Campo
                etiqueta="Autorizado por"
                valor={usuario(r.autorizado_por, r.autorizado_por_usuario)}
              />
              <Campo
                etiqueta="Fecha de autorización"
                valor={fecha(r.autorizado_en)}
              />
              {r.motivo_autorizacion && (
                <Campo
                  etiqueta="Motivo de autorización"
                  valor={r.motivo_autorizacion}
                  completo
                />
              )}
            </Seccion>

            <Seccion titulo="Rechazo" icono={<X className="h-4 w-4" />}>
              <Campo
                etiqueta="Rechazado por"
                valor={usuario(r.rechazado_por, r.rechazado_por_usuario)}
              />
              <Campo
                etiqueta="Fecha de rechazo"
                valor={fecha(r.rechazado_en)}
              />
              {r.motivo_rechazo && (
                <Campo
                  etiqueta="Motivo del rechazo"
                  valor={r.motivo_rechazo}
                  completo
                />
              )}
            </Seccion>

            <Seccion
              titulo="Compra"
              icono={<CircleDollarSign className="h-4 w-4" />}
            >
              <Campo
                etiqueta="Comprado por"
                valor={usuario(r.comprado_por, r.comprado_por_usuario)}
              />
              <Campo etiqueta="Fecha de compra" valor={fecha(r.comprado_en)} />
            </Seccion>
          </div>
        </div>
      </aside>
    </>
  );
}
