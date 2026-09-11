import type { EstadoOrden } from '@/types/ordenes';

const ESTADO_CONFIG: Record<EstadoOrden, { label: string; className: string }> = {
  recepcion: {
    label: 'Recepción',
    className: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  },
  esperando_pago_diagnostico: {
    label: 'Esperando Pago',
    className: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  },
  diagnostico: {
    label: 'Diagnóstico',
    className: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  },
  esperando_autorizacion_jefe: {
    label: 'Aut. Jefe',
    className: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  },
  esperando_autorizacion_cliente: {
    label: 'Aut. Cliente',
    className: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  },
  en_reparacion: {
    label: 'En Reparación',
    className: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  },
  lista_para_entrega: {
    label: 'Lista para Entrega',
    className: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  },
  no_reparada: {
    label: 'No Reparada',
    className: 'bg-red-50 text-red-700 ring-red-600/20',
  },
  rechazada_por_cliente: {
    label: 'Rechazada',
    className: 'bg-red-50 text-red-700 ring-red-600/20',
  },
  entregada: {
    label: 'Entregada',
    className: 'bg-green-50 text-green-700 ring-green-600/20',
  },
};

export function EstadoBadge({ estado }: { estado: EstadoOrden }) {
  const config = ESTADO_CONFIG[estado];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  );
}