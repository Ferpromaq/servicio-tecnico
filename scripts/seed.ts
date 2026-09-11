import { crearClientes } from "./generators/clientes";
import { crearMaquinas } from "./generators/maquinas";
import { crearOrdenes } from "./generators/ordenes";
import { crearPagos } from "./generators/pagos";
import { crearMantenimientos } from "./generators/mantenimientos";
import { crearRepuestos } from "./generators/repuestos";
import { crearHistorial } from "./generators/historial";

const TOTAL_CLIENTES = 100;
const TOTAL_MAQUINAS = 150;

async function seed() {
  try {
    console.log("🌱 Iniciando seed...\n");

    const clientes = await crearClientes(TOTAL_CLIENTES);
    console.log(`✅ Clientes creados: ${clientes.length}`);

    const maquinas = await crearMaquinas(clientes, TOTAL_MAQUINAS);
    console.log(`✅ Máquinas creadas: ${maquinas.length}`);

    const ordenes = await crearOrdenes(clientes, maquinas);
    console.log(`✅ Órdenes creadas: ${ordenes.length}`);

    const pagos = await crearPagos(ordenes);
    console.log(`✅ Pagos creados: ${pagos.length}`);

    const mantenimientos = await crearMantenimientos(maquinas);
    console.log(`✅ Mantenimientos creados: ${mantenimientos.length}`);

    const repuestos = await crearRepuestos(ordenes, mantenimientos);
    console.log(`✅ Repuestos creados: ${repuestos.length}`);

    const historial = await crearHistorial(ordenes);
    console.log(`✅ Historial creado: ${historial.length}`);

    console.log("\n🎉 Seed terminado correctamente");
  } catch (error) {
    console.error("❌ Error ejecutando seed:", error);
    process.exit(1);
  }
}

seed();
