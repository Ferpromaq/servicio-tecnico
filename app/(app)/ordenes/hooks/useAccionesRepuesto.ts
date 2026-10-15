"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

// -----------------------------------------------------------------
// RECIBIDO / INSTALADO (solo admin)
// -----------------------------------------------------------------
//
// Solo el admin puede marcar un repuesto como recibido o instalado.
//
// Flujo:
//   autorizado → comprado → recibido → instalado
//
// El estado del repuesto sigue siendo "comprado" mientras se gestionan
// recibido/instalado. Los campos `recibido` e `instalado` representan
// esas etapas posteriores.
export function useAccionesRepuesto(loadRepuestos: () => Promise<void>) {
  const [accionRepuestoEnCurso, setAccionRepuestoEnCurso] = useState<
    string | null
  >(null);

  async function marcarRecibido(repuestoId: string) {
    setAccionRepuestoEnCurso(repuestoId);

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error("No se pudo identificar al usuario actual.");
      }

      const { error } = await supabase
        .from("repuestos_solicitados")
        .update({
          recibido: true,
          recibido_en: new Date().toISOString(),
          recibido_por: auth.user.id,
        })
        .eq("id", repuestoId)
        .eq("estado", "comprado")
        .eq("recibido", false);

      if (error) throw error;

      await loadRepuestos();
    } catch (error) {
      console.error("Error marcando repuesto como recibido:", error);

      alert(
        error instanceof Error
          ? error.message
          : "No se pudo marcar el repuesto como recibido.",
      );
    } finally {
      setAccionRepuestoEnCurso(null);
    }
  }

  async function marcarInstalado(repuestoId: string) {
    setAccionRepuestoEnCurso(repuestoId);

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error("No se pudo identificar al usuario actual.");
      }

      const { error } = await supabase
        .from("repuestos_solicitados")
        .update({
          instalado: true,
          instalado_en: new Date().toISOString(),
          instalado_por: auth.user.id,
        })
        .eq("id", repuestoId)
        .eq("estado", "comprado")
        .eq("recibido", true)
        .eq("instalado", false);

      if (error) throw error;

      await loadRepuestos();
    } catch (error) {
      console.error("Error marcando repuesto como instalado:", error);

      alert(
        error instanceof Error
          ? error.message
          : "No se pudo marcar el repuesto como instalado.",
      );
    } finally {
      setAccionRepuestoEnCurso(null);
    }
  }

  return { accionRepuestoEnCurso, marcarRecibido, marcarInstalado };
}
