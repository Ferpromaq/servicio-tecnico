import { useState } from "react";
import { supabase } from "@/app/(app)/ordenes/lib/supabaseClient";
import { esPendiente } from "../nueva/types";
import type { ClienteSeleccionado, MaquinaSeleccionada } from "../nueva/types";
import type { Tecnico } from "./useTecnicoSelection";

interface CrearOrdenParams {
  cliente: ClienteSeleccionado;
  maquina: MaquinaSeleccionada;
  tecnico: Tecnico;
  tieneGarantia: boolean | null;
  numeroBoletaCompra: string;
  montoRevision: string;
  numeroBoletaRevision: string;
  descripcion: string;
}

/**
 * Todo el flujo de escritura a Supabase (crear/reutilizar cliente,
 * crear/actualizar máquina + maquinas_cliente, crear la orden, y si
 * corresponde el pago de diagnóstico) vive aquí, aislado de la UI.
 */
export function useCrearOrden(onCreated: () => void | Promise<void>) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(params: CrearOrdenParams) {
    const {
      cliente,
      maquina,
      tecnico,
      tieneGarantia,
      numeroBoletaCompra,
      montoRevision,
      numeroBoletaRevision,
      descripcion,
    } = params;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Resolver cliente (crear si es nuevo)
      let clienteId: string;
      if (esPendiente(cliente)) {
        const { data, error: clienteError } = await supabase
          .from("clientes")
          .insert({
            nombre_razon_social: cliente.nombre_razon_social,
            rut: cliente.rut,
            telefono: cliente.telefono || null,
            correo: cliente.correo || null,
            direccion: cliente.direccion || null,
            ciudad: cliente.ciudad || null,
          })
          .select()
          .single();
        if (clienteError) throw clienteError;
        clienteId = data.id;
      } else {
        clienteId = cliente.id;
      }

      // 2. Resolver máquina (crear + vincular a maquinas_cliente si es nueva)
      let maquinaId: string;
      if (esPendiente(maquina)) {
        const { data: maquinaData, error: maquinaError } = await supabase
          .from("maquinas")
          .insert({
            tipo: "cliente",
            nombre: maquina.nombre,
            modelo: maquina.modelo,
            marca: maquina.marca || null,
            numero_serie: maquina.numero_serie || null,
            cliente_id: clienteId, // ← agregar esto
          })
          .select()
          .single();
        if (maquinaError) throw maquinaError;
        maquinaId = maquinaData.id;

        const { error: relError } = await supabase
          .from("maquinas_cliente")
          .insert({
            maquina_id: maquinaId,
            cliente_id: clienteId,
            tiene_garantia: tieneGarantia,
            numero_boleta_compra: tieneGarantia ? numeroBoletaCompra : null,
          });
        if (relError) throw relError;
      } else {
        maquinaId = maquina.id;
        const { error: updError } = await supabase
          .from("maquinas_cliente")
          .update({
            tiene_garantia: tieneGarantia,
            numero_boleta_compra: tieneGarantia ? numeroBoletaCompra : null,
          })
          .eq("maquina_id", maquinaId);
        if (updError) throw updError;
      }

      // 3. Crear la orden (numero_orden y estado los define la BD)
      const { data: orden, error: ordenError } = await supabase
        .from("ordenes_servicio")
        .insert({
          cliente_id: clienteId,
          maquina_id: maquinaId,
          tecnico_id: tecnico.id,
          garantia_cubre_dano: null,
          garantia_ingreso: tieneGarantia,
          descripcion_problema: descripcion,
        })
        .select()
        .single();
      if (ordenError) throw ordenError;

      // 4. Si no tiene garantía, registrar el pago de la revisión
      if (tieneGarantia === false) {
        const { error: pagoError } = await supabase.from("pagos").insert({
          orden_id: orden.id,
          tipo: "diagnostico",
          monto: Number(montoRevision),
          numero_boleta: numeroBoletaRevision,
        });
        if (pagoError) throw pagoError;
      }

      setDone(true);
      await onCreated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al crear la orden.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSubmitting(false);
    setDone(false);
    setError(null);
  }

  return { submitting, done, error, submit, reset };
}
