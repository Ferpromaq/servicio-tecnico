// Tipos del flujo "Nueva orden de servicio"

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
  id: string;
  nombre: string;
  modelo: string;
  marca?: string | null;
  numero_serie?: string | null;
  tiene_garantia?: boolean | null;
  numero_boleta_compra?: string | null;
}

export type ClienteNuevo = Omit<Cliente, "id">;
export type MaquinaNueva = Pick<Maquina, "nombre" | "modelo" | "marca" | "numero_serie">;

// Mientras no se hayan insertado en Supabase, cliente/máquina "nuevos"
// se marcan con __pendiente para que el submit sepa que debe crearlos.
export type ClienteSeleccionado = Cliente | (ClienteNuevo & { __pendiente: true });
export type MaquinaSeleccionada = Maquina | (MaquinaNueva & { __pendiente: true });

export function esPendiente<T extends object>(
  x: T
): x is T & { __pendiente: true } {
  return "__pendiente" in x && x.__pendiente === true;
}