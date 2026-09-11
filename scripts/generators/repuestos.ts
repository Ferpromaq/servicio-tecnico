import { fakerES } from "@faker-js/faker";
import { supabase } from "../supabase";

const faker = fakerES;

export interface Repuesto {
  id: string;
  nombre_repuesto: string;
}

const catalogoRepuestos = [
  "Bujía",
  "Filtro de aire",
  "Filtro de aceite",
  "Filtro de combustible",
  "Carburador",
  "Bobina de encendido",
  "Rodamiento 6203",
  "Rodamiento 6204",
  "Retén de aceite",
  "Juego de retenes",
  "Juego de empaquetaduras",
  "Pistón",
  "Anillos de pistón",
  "Cigüeñal",
  "Biela",
  "Válvula de admisión",
  "Válvula de escape",
  "Correa de transmisión",
  "Polea",
  "Tensor de correa",
  "Interruptor",
  "Interruptor de seguridad",
  "Capacitor",
  "Condensador",
  "Motor eléctrico",
  "Rotor",
  "Estator",
  "Escobillas",
  "Ventilador",
  "Hélice",
  "Bomba de agua",
  "Kit de reparación de bomba",
  "Manguera hidráulica",
  "Manguera de combustible",
  "Regulador de voltaje",
  "Alternador",
  "Relé",
  "Batería 12V",
  "Cargador de batería",
  "Kit de juntas",
  "Aceite SAE 10W-30",
  "Aceite hidráulico ISO 46",
  "Grasa multipropósito",
  "Sello mecánico",
  "Kit de reparación de carburador",
];

const estados = ["pendiente", "autorizado", "comprado"] as const;

export async function crearRepuestos(
  ordenes: any[],
  mantenimientos: any[],
): Promise<Repuesto[]> {
  const registros = [
    ...ordenes.map((orden) => ({
      origen_tipo: "orden_servicio",
      origen_id: orden.id,
    })),

    ...mantenimientos.map((mantenimiento) => ({
      origen_tipo: "mantenimiento",
      origen_id: mantenimiento.id,
    })),
  ];

  const repuestos = registros
    .filter(() => faker.datatype.boolean())
    .map((registro) => ({
      origen_tipo: registro.origen_tipo,

      origen_id: registro.origen_id,

      nombre_repuesto: faker.helpers.arrayElement(catalogoRepuestos),

      valor: faker.number.int({
        min: 3000,
        max: 350000,
      }),

      cantidad: faker.number.int({
        min: 1,
        max: 8,
      }),

      estado: faker.helpers.arrayElement(estados),
    }));

  if (!repuestos.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("repuestos_solicitados")
    .insert(repuestos)
    .select();

  if (error) {
    throw new Error(`Error creando repuestos: ${error.message}`);
  }

  return data as Repuesto[];
}
