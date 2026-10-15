import type { DrawerTab, EstadoRepuesto, Rol, TabKey } from "./types";

export const TABS: { key: TabKey; label: string; estados: string[] }[] = [
  { key: "todas", label: "Todas", estados: [] },
  { key: "recepcion", label: "Recepción", estados: ["recepcion"] },
  { key: "diagnostico", label: "Diagnóstico", estados: ["diagnostico"] },
  { key: "en_reparacion", label: "Reparación", estados: ["en_reparacion"] },
  { key: "listas", label: "Listas", estados: ["lista_para_entrega"] },
  { key: "entregadas", label: "Entregadas", estados: ["entregada"] },
  {
    key: "rechazadas",
    label: "Rechazadas",
    estados: ["rechazada_por_cliente"],
  },
];

export const DRAWER_TABS: { key: DrawerTab; label: string }[] = [
  { key: "resumen", label: "Resumen" },
  { key: "diagnostico", label: "Diagnóstico" },
  { key: "repuestos", label: "Repuestos" },
  { key: "pagos", label: "Pagos" },
  { key: "historial", label: "Historial" },
];

export const ESTADO_STYLES: Record<string, string> = {
  recepcion: "bg-orange-50 text-orange-600",
  esperando_pago_diagnostico: "bg-yellow-50 text-yellow-700",
  diagnostico: "bg-purple-50 text-purple-600",
  esperando_autorizacion_jefe: "bg-amber-50 text-amber-700",
  esperando_autorizacion_cliente: "bg-indigo-50 text-indigo-600",
  esperando_repuestos: "bg-pink-50 text-pink-600",
  en_reparacion: "bg-orange-50 text-orange-600",
  lista_para_entrega: "bg-blue-50 text-blue-600",
  no_reparada: "bg-gray-100 text-gray-600",
  rechazada_por_cliente: "bg-red-50 text-red-600",
  entregada: "bg-green-50 text-green-600",
};

export const ESTADO_LABELS: Record<string, string> = {
  recepcion: "Recepción",
  esperando_pago_diagnostico: "Esperando Pago Diagnóstico",
  diagnostico: "Diagnóstico",
  esperando_autorizacion_jefe: "Esperando Autorización Jefe",
  esperando_autorizacion_cliente: "Esperando Autorización Cliente",
  esperando_repuestos: "Esperando Repuestos",
  en_reparacion: "En Reparación",
  lista_para_entrega: "Lista para Entrega",
  no_reparada: "No Reparada",
  rechazada_por_cliente: "Rechazada por Cliente",
  entregada: "Entregada",
};

export const ROLES_QUE_PUEDEN_SOLICITAR: Rol[] = ["tecnico", "supervisor"];

export const ESTADO_REPUESTO_STYLES: Record<EstadoRepuesto, string> = {
  pendiente: "bg-amber-50 text-amber-700 ring-amber-600/20",
  autorizado: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rechazado: "bg-rose-50 text-rose-700 ring-rose-600/20",
  comprado: "bg-blue-50 text-blue-700 ring-blue-600/20",
};

export const ESTADO_REPUESTO_LABELS: Record<EstadoRepuesto, string> = {
  pendiente: "Pendiente",
  autorizado: "Autorizado",
  rechazado: "Rechazado",
  comprado: "Comprado",
};
