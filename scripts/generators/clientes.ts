import { fakerES } from "@faker-js/faker";
import { supabase } from "../supabase";

const faker = fakerES;

export interface Cliente {
  id: string;
  nombre_razon_social: string;
  rut: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
}

function generarRut(): string {
  const numero = faker.number.int({
    min: 5000000,
    max: 25000000,
  });

  const digito = faker.helpers.arrayElement([
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "K",
  ]);

  return `${numero}-${digito}`;
}

export async function crearClientes(cantidad: number): Promise<Cliente[]> {
  const clientes = Array.from({ length: cantidad }, () => ({
    nombre_razon_social: faker.person.fullName(),

    rut: generarRut(),

    telefono: faker.phone.number(),

    correo: faker.internet.email().toLowerCase(),

    direccion: faker.location.streetAddress(),
  }));

  const { data, error } = await supabase
    .from("clientes")
    .insert(clientes)
    .select();

  if (error) {
    throw new Error(`Error creando clientes: ${error.message}`);
  }

  return data as Cliente[];
}
