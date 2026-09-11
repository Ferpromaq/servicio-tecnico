import type { SupabaseClient } from '@supabase/supabase-js';
import { ESTADOS_POR_TAB, type TabOrdenes, type OrdenServicioListItem } from '@/types/ordenes';

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

  // Nota: el nombre `ordenes_servicio_tecnico_id_fkey` es el que Postgres
  // genera automáticamente para el FK de tecnico_id -> usuarios(id).
  // Si en tu base de datos le pusiste un nombre distinto al constraint,
  // ajusta este string (puedes verlo en Supabase > Database > Tables >
  // ordenes_servicio > Foreign Keys).
  let query = supabase
    .from('ordenes_servicio')
    .select(
      `
      id,
      numero_orden,
      created_at,
      estado,
      cliente:clientes ( nombre_razon_social ),
      maquina:maquinas ( nombre, modelo ),
      tecnico:usuarios!ordenes_servicio_tecnico_id_fkey ( nombre )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  const estados = ESTADOS_POR_TAB[tab];
  if (estados.length > 0) {
    query = query.in('estado', estados);
  }

  if (search && search.trim().length > 0) {
    // Por ahora solo busca por número de orden. PostgREST no permite
    // filtrar con OR sobre columnas de tablas relacionadas (cliente,
    // máquina) en una sola consulta embebida. Si más adelante quieres
    // buscar también por nombre de cliente o de máquina, lo mejor es
    // crear una vista o función RPC en Postgres que haga el join y
    // exponga esas columnas directamente para poder filtrarlas.
    query = query.ilike('numero_orden', `%${search.trim()}%`);
  }

  // .returns<>() le dice a TypeScript la forma real del resultado.
  // Sin esto, al no tener los tipos generados desde tu base de datos
  // (con `supabase gen types typescript`), el cliente asume por
  // defecto que toda relación embebida podría ser un array — aunque
  // en este caso cliente/maquina/tecnico son siempre un solo objeto
  // (cada orden tiene un solo cliente, una sola máquina, un técnico).
  const { data, error, count } = await query.returns<OrdenServicioListItem[]>();

  if (error) throw error;

  return {
    ordenes: data ?? [],
    total: count ?? 0,
  };
}