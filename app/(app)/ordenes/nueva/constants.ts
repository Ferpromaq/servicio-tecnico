import type { ClienteNuevo, MaquinaNueva } from "./types";

export const CLIENTE_VACIO: ClienteNuevo = {
  nombre_razon_social: "",
  rut: "",
  telefono: "",
  correo: "",
  direccion: "",
  ciudad: "",
};

export const MAQUINA_VACIA: MaquinaNueva = {
  nombre: "",
  modelo: "",
  numero_serie: "",
  marca: "",
};

export const inputBase =
  "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";
