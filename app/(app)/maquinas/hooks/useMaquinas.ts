"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Maquina } from "../types";

export function useMaquinas() {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMaquinas = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.from("demo_maquinas").select("*");

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      const formattedData: Maquina[] =
        data?.map((item: any) => ({
          id: item.id,
          codigo_interno: item.codigo_interno,
          nombre: item.nombre,
          marca: item.marca,
          modelo: item.modelo,
          es_propia: item.es_propia,
          estado: item.estado,
          horas_uso: item.horas_uso,
          diagnostico: item.diagnostico,
          cliente_nombre:
            item.demo_clientes?.nombre_razon_social ?? "FerProMaq (Propia)",
        })) ?? [];

      setMaquinas(formattedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaquinas();
  }, [fetchMaquinas]);

  return { maquinas, loading, refetch: fetchMaquinas };
}