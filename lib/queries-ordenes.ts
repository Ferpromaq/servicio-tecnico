import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ESTADOS_POR_TAB,
  type TabOrdenes,
  type OrdenServicioListItem,
} from "@/types/ordenes";

interface GetOrdenesParams {
  tab: TabOrdenes;
  search?: string;
  page: number;
  pageSize?: number;
}

export async function getOrdenesServicio(
  supabase: SupabaseClient,
  { tab, search, page, pageSize = 10 }: GetOrdenesParams
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("ordenes_servicio")
    .select(
      `
        id,
        numero_orden,
        created_at,
        estado,
        cliente:clientes (
          nombre_razon_social
        ),
        maquina:maquinas (
          nombre,
          modelo
        ),
        tecnico:usuarios!ordenes_servicio_tecnico_id_fkey (
          nombre
        )
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  const estados = ESTADOS_POR_TAB[tab];

  if (estados.length > 0) {
    query = query.in("estado", estados);
  }

  if (search?.trim()) {
    query = query.ilike(
      "numero_orden",
      `%${search.trim()}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error Supabase getOrdenesServicio:", error);
    throw error;
  }

  return {
    ordenes: (data ?? []) as unknown as OrdenServicioListItem[],
    total: count ?? 0,
  };
}