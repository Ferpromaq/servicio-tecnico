import { fakerES } from "@faker-js/faker";
import { supabase } from "../supabase";

const faker = fakerES;

export interface HistorialEstado {
  id: string;
  origen_tipo: string;
  origen_id: string;
  estado_nuevo: string;
}

const flujoEstados = [
  "recepcion",
  "diagnostico",
  "en_reparacion",
  "lista_para_entrega",
  "entregada",
];

export async function crearHistorial(
  ordenes: any[],
): Promise<HistorialEstado[]> {

  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id")
    .eq("activo", true);

  const historial: any[] = [];

  for (const orden of ordenes) {

    // Estados que tendrá esta orden
    const estados = [...flujoEstados];

    // Algunas órdenes terminan como no reparadas
    if (
      orden.estado === "no_reparada" &&
      estados.includes("en_reparacion")
    ) {
      estados.splice(
        estados.indexOf("lista_para_entrega"),
        2,
        "no_reparada",
      );
    }

    let estadoAnterior: string | null = null;

    const fechaBase = faker.date.between({
      from: "2024-01-01",
      to: new Date(),
    });

    for (let i = 0; i < estados.length; i++) {

      historial.push({

        origen_tipo: "orden_servicio",

        origen_id: orden.id,

        estado_anterior: estadoAnterior,

        estado_nuevo: estados[i],

        usuario_id:
          usuarios?.length
            ? faker.helpers.arrayElement(usuarios).id
            : null,

        created_at: new Date(
          fechaBase.getTime() + i * 1000 * 60 * 60 * 24,
        ).toISOString(),

      });

      estadoAnterior = estados[i];
    }
  }

  if (!historial.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("historial_estados")
    .insert(historial)
    .select();

  if (error) {
    throw new Error(
      `Error creando historial: ${error.message}`,
    );
  }

  return data as HistorialEstado[];
}