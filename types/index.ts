export interface Cliente {
  id: string;
  nombre_razon_social: string;
  rut: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  ciudad: string | null;
}

export interface Maquina {
  id: number;
  cliente_id: number;
  marca: string;
  modelo: string;
  serie?: string;
  codigo_interno?: string;
  horas_uso?: number;
}

export interface OrdenServicio {
  id: number;
  numero: string;
  cliente: Cliente;
  maquina: Maquina;
  tecnico?: string;
  fecha_ingreso: string;
  estado:
    | "Recepcion"
    | "Diagnostico"
    | "Esperando_Repuestos"
    | "En_Reparacion"
    | "Lista_Entrega"
    | "Entregada";
  descripcion_problema?: string;
}
