import { fakerES } from "@faker-js/faker";
import { supabase } from "../supabase";
import type { Cliente } from "./clientes";

const faker = fakerES;

export interface Maquina {
  id: string;
  tipo: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
}

const tipos = ["cliente", "empresa"] as const;

const marcas = [
  "Bosch",
  "Makita",
  "DeWalt",
  "Hilti",
  "Stanley",
  "Einhell",
  "Kärcher",
  "Hyundai",
  "Honda",
  "Ingco",
  "Total",
  "Wacker Neuson",
  "Lusqtoff",
  "Bauker",
  "Black+Decker",
];

const maquinas = [
  "Generador Eléctrico",
  "Soldadora Inverter",
  "Compresor de Aire",
  "Hidrolavadora",
  "Motobomba",
  "Placa Compactadora",
  "Cortadora de Pavimento",
  "Taladro Percutor",
  "Rotomartillo",
  "Esmeril Angular",
  "Demoledor",
  "Hormigonera",
  "Vibrador de Hormigón",
  "Aspiradora Industrial",
  "Sierra Circular",
  "Sierra de Banco",
  "Motosierra",
  "Orilladora",
  "Desbrozadora",
  "Generador Diésel",
  "Generador Gasolina",
  "Compresor Vertical",
  "Compresor Horizontal",
  "Pulidora",
  "Lijadora Orbital",
  "Atornillador de Impacto",
  "Taladro Inalámbrico",
  "Martillo Demoledor",
  "Cortasetos",
  "Motocultivador",
];

function generarModelo(): string {
  return `${faker.string.alpha({
    length: 2,
    casing: "upper",
  })}-${faker.number.int({
    min: 100,
    max: 9999,
  })}`;
}

function generarSerie(): string {
  return faker.string.alphanumeric({
    length: 12,
    casing: "upper",
  });
}

export async function crearMaquinas(
  clientes: Cliente[],
  cantidad: number,
): Promise<Maquina[]> {
  const maquinasBase = Array.from({ length: cantidad }, () => ({
    tipo: faker.helpers.arrayElement(tipos),

    nombre: faker.helpers.arrayElement(maquinas),

    marca: faker.helpers.arrayElement(marcas),

    modelo: generarModelo(),

    numero_serie: generarSerie(),
  }));

  const { data: maquinasInsertadas, error } = await supabase
    .from("maquinas")
    .insert(maquinasBase)
    .select();

  if (error) {
    throw new Error(`Error creando máquinas: ${error.message}`);
  }

  const relaciones = maquinasInsertadas.map((maquina) => ({
    maquina_id: maquina.id,

    cliente_id: faker.helpers.arrayElement(clientes).id,

    tiene_garantia: faker.datatype.boolean(),
  }));

  const { error: errorRelacion } = await supabase
    .from("maquinas_cliente")
    .insert(relaciones);

  if (errorRelacion) {
    throw new Error(`Error relacionando máquinas: ${errorRelacion.message}`);
  }

  return maquinasInsertadas as Maquina[];
}
