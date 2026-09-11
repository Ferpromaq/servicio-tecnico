"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export interface Tecnico {
  id: string;
  nombre: string;
  telefono: string | null;
}

export function useTecnicoSelection() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [tecnico, setTecnico] = useState<Tecnico | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarTecnicos = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nombre, telefono")
      .eq("rol", "tecnico")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error cargando técnicos:", error);
      setError(error.message);
      setTecnicos([]);
    } else {
      setTecnicos(data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    cargarTecnicos();
  }, [cargarTecnicos]);

  function reset() {
    setTecnico(null);
  }

  return {
    tecnicos,
    tecnico,
    setTecnico,
    loading,
    error,
    reset,
  };
}