export type TabKey =
  | "todas"
  | "recepcion"
  | "diagnostico"
  | "en_reparacion"
  | "listas"
  | "entregadas"
  | "rechazadas";

export type Rol = "admin" | "tecnico" | "supervisor" | string;

export type EstadoRepuesto =
  | "pendiente"
  | "autorizado"
  | "rechazado"
  | "comprado";

export type DrawerTab =
  | "resumen"
  | "diagnostico"
  | "repuestos"
  | "pagos"
  | "historial";

export interface OrdenListItem {
  id: string;
  numero_orden: string;
  estado: string;
  created_at: string;
  descripcion_problema: string | null;
  cliente: { nombre_razon_social: string } | null;
  maquina: { nombre: string; modelo: string | null } | null;
  tecnico: { nombre: string } | null;
}

export interface OrdenDetalle {
  id: string;
  numero_orden: string;
  estado: string;
  created_at: string;
  updated_at: string;
  descripcion_problema: string | null;
  numero_boleta: string | null;
  diagnostico: string | null;
  garantia_ingreso: boolean | null;
  garantia_cubre_dano: boolean | null;
  razon_no_cubre: string | null;
  foto_dano_url: string | null;
  informe_no_reparada: string | null;
  entrega_marcada_por: string | null;
  entrega_marcada_por_usuario: {
    nombre: string;
  } | null;
  cliente: {
    nombre_razon_social: string;
    rut: string;
    telefono: string | null;
    correo: string | null;
    direccion: string | null;
  } | null;
  maquina: {
    id: string;
    nombre: string;
    marca: string | null;
    modelo: string | null;
    numero_serie: string | null;
    tipo: string;
  } | null;
  tecnico: { nombre: string; telefono: string | null } | null;
  reparacion_autorizada_por: string | null;
  reparacion_autorizada_en: string | null;
  reparacion_autorizacion_motivo: string | null;
  entrega_forzada: boolean | null;
  motivo_entrega_forzada: string | null;
  entrega_marcada_en: string | null;
}

export interface HistorialItem {
  id: string;
  estado_anterior: string | null;
  estado_nuevo: string;
  created_at: string;
  usuario: { nombre: string } | null;
}

export interface RepuestoItem {
  id: string;
  nombre_repuesto: string;
  valor: number;
  cantidad: number;
  estado: string;
  created_at: string;
  garantia_cubre_repuesto: boolean;

  recibido: boolean;
  recibido_en: string | null;
  recibido_por: string | null;

  // Instalación: solo tiene sentido una vez que el repuesto ya está
  // recibido. Determina, junto con `recibido`, si la orden puede pasar
  // a "lista para entrega" sin necesidad de forzarla.
  instalado: boolean;
  instalado_en: string | null;
  instalado_por: string | null;

  motivo_autorizacion: string | null;
  motivo_rechazo: string | null;

  autorizado_por: string | null;
  autorizado_en: string | null;
  rechazado_por: string | null;
  rechazado_en: string | null;

  autorizado_por_usuario?: {
    nombre: string;
  } | null;

  rechazado_por_usuario?: {
    nombre: string;
  } | null;

  recibido_por_usuario?: {
    nombre: string;
  } | null;

  instalado_por_usuario?: {
    nombre: string;
  } | null;
}

export interface PagoItem {
  id: string;
  tipo: string;
  numero_boleta: string;
  fecha_pago: string;
  monto: number | null;
}

export interface RepuestoFormItem {
  id: string;
  nombre: string;
  cantidad: string;
  valor: string;
  garantia_cubre_repuesto: boolean;
}

export interface MotivoModalState {
  tipo: "autorizado" | "rechazado";
  motivo: string;
  repuestoNombre: string;
}
