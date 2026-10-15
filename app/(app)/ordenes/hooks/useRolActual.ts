"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Rol } from "../lib/types";

// ---------------------------------------------------------------------
// ROL DEL USUARIO ACTUAL
//
// Se resuelve una sola vez en la vista principal y se pasa al drawer,
// para no volver a consultarlo cada vez que se abre una orden distinta.
// ---------------------------------------------------------------------
export function useRolActual() {
  const [rol, setRol] = useState<Rol | null>(null);
  const [checkingRol, setCheckingRol] = useState(true);

  useEffect(() => {
    async function checkRol() {
      setCheckingRol(true);

      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        setRol(null);
        setCheckingRol(false);
        return;
      }

      const { data: usuario, error: usuarioError } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", auth.user.id)
        .single();

      if (usuarioError) {
        console.error("Error obteniendo rol:", usuarioError);
        setRol(null);
        setCheckingRol(false);
        return;
      }

      setRol(usuario?.rol ?? null);
      setCheckingRol(false);
    }

    checkRol();
  }, []);

  return { rol, checkingRol };
}
