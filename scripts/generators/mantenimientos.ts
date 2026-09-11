import { fakerES } from "@faker-js/faker";
import { supabase } from "../supabase";
import type { Maquina } from "./maquinas";

const faker = fakerES;

export interface Mantenimiento {
  id: string;
  maquina_id: string;
  descripcion: string;
}

const descripciones = [
  "Cambio de aceite del motor.",
  "Lubricación general de componentes.",
  "Limpieza completa del carburador.",
  "Cambio de filtro de aire.",
  "Cambio de filtro de combustible.",
  "Revisión del sistema eléctrico.",
  "Ajuste general de pernos y fijaciones.",
  "Cambio de rodamientos.",
  "Inspección preventiva completa.",
  "Cambio de correa de transmisión.",
  "Limpieza del sistema de refrigeración.",
  "Revisión del sistema de arranque.",
  "Cambio de bujía.",
  "Calibración del carburador.",
  "Revisión del sistema de combustible.",
  "Cambio de aceite hidráulico.",
  "Revisión de fugas de aceite.",
  "Limpieza de contactos eléctricos.",
  "Inspección del sistema de transmisión.",
  "Mantenimiento preventivo general.",
];

const resultados = [
  "Equipo funcionando correctamente.",
  "Equipo reparado y probado satisfactoriamente.",
  "Se recomienda cambio de rodamientos.",
  "Se recomienda reemplazar la correa.",
  "Se detectó desgaste normal por uso.",
  "Pendiente autorización para cambio de repuestos.",
  "Requiere reparación mayor.",
  "Sistema eléctrico reparado.",
  "Motor ajustado correctamente.",
  "Equipo listo para entrega.",
  "No fue posible reparar con los repuestos disponibles.",
  "Equipo operativo después del mantenimiento.",
];

const informesNoReparada = [
  "Cliente no autorizó la reparación.",
  "Costo de reparación superior al valor del equipo.",
  "No existen repuestos disponibles.",
  "Motor con daño estructural irreversible.",
  "Equipo declarado fuera de servicio.",
];

export async function crearMantenimientos(
  maquinas: Maquina[],
): Promise<Mantenimiento[]> {
  const { data: tecnicos } = await supabase
    .from("usuarios")
    .select("id")
    .eq("rol", "tecnico")
    .eq("activo", true);

  const mantenimientos = maquinas
    .filter(() => faker.datatype.boolean())
    .map((maquina) => {
      const requiereMantenimiento =
        faker.datatype.boolean();

      const resultado =
        faker.helpers.arrayElement(resultados);

      const noReparada =
        resultado === "No fue posible reparar con los repuestos disponibles."
          ? faker.helpers.arrayElement(informesNoReparada)
          : null;

      return {
        maquina_id: maquina.id,

        tecnico_id:
          tecnicos?.length
            ? faker.helpers.arrayElement(tecnicos).id
            : null,

        fecha_revision: faker.date
          .between({
            from: "2024-01-01",
            to: new Date(),
          })
          .toISOString()
          .split("T")[0],

        requiere_mantenimiento:
          requiereMantenimiento,

        descripcion:
          faker.helpers.arrayElement(descripciones),

        resultado,

        informe_no_reparada:
          noReparada,

        proxima_revision:
          faker.date
            .future({
              years: 2,
            })
            .toISOString()
            .split("T")[0],
      };
    });

  if (!mantenimientos.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("mantenimientos")
    .insert(mantenimientos)
    .select();

  if (error) {
    throw new Error(
      `Error creando mantenimientos: ${error.message}`,
    );
  }

  return data as Mantenimiento[];
}