import { useEffect, useState } from "react";
import { supabase } from "@/app/(app)/ordenes/lib/supabaseClient";
import type { Maquina } from "../nueva/types";

interface MaquinaClienteRow {
  maquina_id: string;
  tiene_garantia: boolean | null;
  numero_boleta_compra: string | null;
  maquinas: { id: string; nombre: string; modelo: string; numero_serie: string | null; marca: string | null } | null;
}

/** Trae las máquinas ya registradas de un cliente (vía maquinas_cliente). */
export function useMaquinaSearch(clienteId: string | undefined, open: boolean) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Maquina[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !clienteId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    supabase
      .from("maquinas_cliente")
      .select(
        `
        maquina_id,
        tiene_garantia,
        numero_boleta_compra,
        maquinas ( id, nombre, modelo, numero_serie, marca )
        `
      )
      .eq("cliente_id", clienteId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message);
        } else {
          const rows = (data as unknown as MaquinaClienteRow[]) || [];
          const mapped: Maquina[] = rows
            .filter((row) => row.maquinas)
            .map((row) => ({
              id: row.maquinas!.id,
              nombre: row.maquinas!.nombre,
              modelo: row.maquinas!.modelo,
              numero_serie: row.maquinas!.numero_serie,
              marca: row.maquinas!.marca,
              tiene_garantia: row.tiene_garantia,
              numero_boleta_compra: row.numero_boleta_compra,
            }));
          const q = query.trim().toLowerCase();
          setResults(q ? mapped.filter((m) => `${m.nombre} ${m.modelo}`.toLowerCase().includes(q)) : mapped);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clienteId, open, query]);

  return { query, setQuery, results, loading, error };
}
