import { useEffect, useState } from "react";
import { supabase } from "@/app/(app)/ordenes/lib/supabaseClient";
import { useDebouncedValue } from "../nueva/utils";
import { Cliente } from "@/types";

/** Búsqueda en vivo de clientes contra Supabase, con debounce. */
export function useClienteSearch(open: boolean) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    let req = supabase.from("clientes").select("*").order("nombre_razon_social").limit(8);
    if (debouncedQuery.trim()) {
      req = req.or(`nombre_razon_social.ilike.%${debouncedQuery}%,rut.ilike.%${debouncedQuery}%`);
    }

    req.then(({ data, error }) => {
      if (cancelled) return;
      if (error) setError(error.message);
      else setResults((data as Cliente[]) || []);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  return { query, setQuery, results, loading, error };
}
