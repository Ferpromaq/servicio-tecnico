import { fakerES } from "@faker-js/faker";
import { supabase } from "../supabase";
import type { Cliente } from "./clientes";
import type { Maquina } from "./maquinas";

const faker = fakerES;

export interface Orden {
  id: string;
  numero_orden: string;
  cliente_id: string;
  maquina_id: string;
}

const estados = [
  "recepcion",
  "diagnostico",
  "en_reparacion",
  "lista_para_entrega",
  "entregada",
  "no_reparada",
] as const;

const problemas = [
  "La máquina no enciende.",
  "Presenta fuga de aceite.",
  "Pierde potencia durante el funcionamiento.",
  "Produce un ruido metálico constante.",
  "No genera corriente eléctrica.",
  "Se apaga después de algunos minutos.",
  "No mantiene la presión de trabajo.",
  "Emite humo blanco al encender.",
  "Tiene una fuerte vibración.",
  "El motor no parte con el arranque manual.",
  "No acelera correctamente.",
  "Presenta olor a quemado.",
  "Consume combustible en exceso.",
  "El interruptor principal no responde.",
  "La batería no carga.",
  "No desarrolla la potencia habitual.",
  "Presenta pérdida de compresión.",
  "Se detiene bajo carga.",
  "Tiene filtraciones de combustible.",
  "La transmisión produce ruidos.",
];

const diagnosticos = [
  "Carburador obstruido.",
  "Bobina de encendido defectuosa.",
  "Bujía desgastada.",
  "Rodamientos con desgaste excesivo.",
  "Filtro de aire saturado.",
  "Filtro de combustible obstruido.",
  "Sistema eléctrico sulfatado.",
  "Condensador defectuoso.",
  "Motor con baja compresión.",
  "Retenes deteriorados.",
  "Correa de transmisión desgastada.",
  "Regulador de voltaje dañado.",
  "Interruptor principal averiado.",
  "Falta mantenimiento preventivo.",
  "Aceite contaminado.",
  "Escobillas desgastadas.",
  "Ventilador de enfriamiento dañado.",
  "Pistón con desgaste.",
  "Empaquetadura dañada.",
  "Equipo requiere cambio de repuestos.",
];

export async function crearOrdenes(
  clientes: Cliente[],
  maquinas: Maquina[],
): Promise<Orden[]> {
  const { data: tecnicos } = await supabase
    .from("usuarios")
    .select("id")
    .eq("rol", "tecnico")
    .eq("activo", true);

  const año = new Date().getFullYear();

  const ordenes = Array.from(
    { length: 200 },
    (_, index) => {
      const cliente = faker.helpers.arrayElement(clientes);
      const maquina = faker.helpers.arrayElement(maquinas);

      return {
        numero_orden: `OS-${año}-${String(index + 1).padStart(5, "0")}`,

        cliente_id: cliente.id,

        maquina_id: maquina.id,

        tecnico_id:
          tecnicos?.length
            ? faker.helpers.arrayElement(tecnicos).id
            : null,

        estado:
          faker.helpers.arrayElement(estados),

        descripcion_problema:
          faker.helpers.arrayElement(problemas),

        diagnostico:
          faker.helpers.arrayElement(diagnosticos),

        garantia_cubre_dano:
          faker.datatype.boolean(),
      };
    },
  );

  const { data, error } = await supabase
    .from("ordenes_servicio")
    .insert(ordenes)
    .select();

  if (error) {
    throw new Error(
      `Error creando órdenes: ${error.message}`,
    );
  }

  return data as Orden[];
}