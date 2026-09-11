import { useState } from "react";
import { CLIENTE_VACIO } from "../nueva/constants";
import type { Cliente, ClienteNuevo, ClienteSeleccionado } from "../nueva/types";

/**
 * Encapsula todo el estado de "qué cliente va en esta orden": el
 * seleccionado (existente o pendiente de crear), y el formulario
 * de alta rápida cuando no existe.
 */
export function useClienteSelection() {
  const [cliente, setCliente] = useState<ClienteSeleccionado | null>(null);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState<ClienteNuevo>(CLIENTE_VACIO);

  function seleccionar(c: Cliente) {
    setCliente(c);
    setCreando(false);
  }

  function iniciarCreacion() {
    setCreando(true);
  }

  function cancelarCreacion() {
    setCreando(false);
  }

  function guardarNuevo() {
    if (!form.nombre_razon_social.trim() || !form.rut.trim()) return;
    // No se inserta aún: queda "pendiente" hasta que se confirme la orden completa.
    setCliente({ __pendiente: true, ...form });
    setCreando(false);
  }

  function limpiar() {
    setCliente(null);
  }

  function reset() {
    setCliente(null);
    setCreando(false);
    setForm(CLIENTE_VACIO);
  }

  return {
    cliente,
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
