import { useState } from "react";
import { MAQUINA_VACIA } from "../nueva/constants";
import type { Maquina, MaquinaNueva, MaquinaSeleccionada } from "../nueva/types";

/** Mismo patrón que useClienteSelection, pero para la máquina. */
export function useMaquinaSelection() {
  const [maquina, setMaquina] = useState<MaquinaSeleccionada | null>(null);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState<MaquinaNueva>(MAQUINA_VACIA);

  function seleccionar(m: Maquina) {
    setMaquina(m);
    setCreando(false);
  }

  function iniciarCreacion() {
    setCreando(true);
  }

  function cancelarCreacion() {
    setCreando(false);
  }

  function guardarNuevo() {
    if (!form.nombre.trim() || !form.modelo.trim()) return;
    setMaquina({ __pendiente: true, ...form });
    setCreando(false);
  }

  function limpiar() {
    setMaquina(null);
  }

  function reset() {
    setMaquina(null);
    setCreando(false);
    setForm(MAQUINA_VACIA);
  }

  return {
    maquina,
    creando,
    form,
    setForm,
    seleccionar,
    iniciarCreacion,
    cancelarCreacion,
    guardarNuevo,
    limpiar,
    reset,
  };
}
