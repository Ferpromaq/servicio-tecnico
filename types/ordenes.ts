// Debe coincidir exactamente con el enum `estado_orden` de Postgres
export type EstadoOrden =
  | 'recepcion'
  | 'esperando_pago_diagnostico'
  | 'diagnostico'
  | 'esperando_autorizacion_jefe'
  | 'esperando_autorizacion_cliente'
  | 'en_reparacion'
  | 'lista_para_entrega'
  | 'no_reparada'
  | 'rechazada_por_cliente'
  | 'entregada';

export interface OrdenServicioListItem {
  id: string;
  numero_orden: string;
  created_at: string;
  estado: EstadoOrden;
  cliente: { nombre_razon_social: string } | null;
  maquina: { nombre: string; modelo: string | null } | null;
  tecnico: { nombre: string } | null;
}

// Pestañas visuales de la lista. Varios estados "de negocio" pueden
// agruparse bajo una misma pestaña (ej: diagnóstico + ambas
// autorizaciones se ven todas como "Diagnóstico" en la UI).
export type TabOrdenes =
  | 'todas'
  | 'recepcion'
  | 'diagnostico'
  | 'reparacion'
  | 'listas'
  | 'entregadas'
  | 'rechazadas';

export const ESTADOS_POR_TAB: Record<TabOrdenes, EstadoOrden[]> = {
  todas: [],
  recepcion: ['recepcion', 'esperando_pago_diagnostico'],
  diagnostico: [
    'diagnostico',
    'esperando_autorizacion_jefe',
    'esperando_autorizacion_cliente',
  ],
  reparacion: ['en_reparacion'],
  listas: ['lista_para_entrega'],
  entregadas: ['entregada'],
  rechazadas: ['no_reparada', 'rechazada_por_cliente'],
};