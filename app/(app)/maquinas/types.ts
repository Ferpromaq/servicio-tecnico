export interface Maquina {
  id: number;
  codigo_interno: string | null;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  es_propia: boolean;
  estado: string;
  horas_uso: number;
  diagnostico: string | null;
  cliente_nombre: string | null;
}