import { fakerES } from "@faker-js/faker";
import { supabase } from "../supabase";
import type { Orden } from "./ordenes";

const faker = fakerES;

export interface Pago {
  id: string;
  orden_id: string;
  tipo: string;
  numero_boleta: string;
}

const tiposPago = [
  "diagnostico",
  "repuestos",
  "total_reparacion",
] as const;

export async function crearPagos(
  ordenes: Orden[],
): Promise<Pago[]> {

  const pagos = ordenes
    .filter(() => faker.datatype.boolean())
    .map((orden) => ({

      orden_id: orden.id,

      tipo:
        faker.helpers.arrayElement(tiposPago),

      numero_boleta:
        `B-${faker.number.int({
          min: 10000000,
          max: 99999999,
        })}`,

    }));

  if (!pagos.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("pagos")
    .insert(pagos)
    .select();

  if (error) {
    throw new Error(
      `Error creando pagos: ${error.message}`,
    );
  }

  return data as Pago[];
}