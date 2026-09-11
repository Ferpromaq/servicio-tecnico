'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { OrdenServicioListItem, TabOrdenes } from '@/types/ordenes';
import { EstadoBadge } from './EstadoBadge';

const TABS: { key: TabOrdenes; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'recepcion', label: 'Recepción' },
  { key: 'diagnostico', label: 'Diagnóstico' },
  { key: 'reparacion', label: 'Reparación' },
  { key: 'listas', label: 'Listas' },
  { key: 'entregadas', label: 'Entregadas' },
  { key: 'rechazadas', label: 'Rechazadas' },
];

interface Props {
  ordenes: OrdenServicioListItem[];
  total: number;
  page: number;
  pageSize: number;
  tab: TabOrdenes;
  search: string;
}

export function OrdenesTable({ ordenes, total, page, pageSize, tab, search }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Órdenes de Servicio</h2>
        <Link
          href="/dashboard/ordenes/nueva"
          className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
        >
          + Nueva Orden
        </Link>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => updateParams({ tab: t.key, page: '1' })}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="border-b border-gray-200 p-4">
        <input
          type="text"
          defaultValue={search}
          placeholder="Buscar por N° de orden..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateParams({ q: e.currentTarget.value, page: '1' });
            }
          }}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3 font-medium">N° Orden</th>
              <th className="px-4 py-3 font-medium">Fecha Ingreso</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Máquina</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Técnico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ordenes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  No hay órdenes que coincidan con este filtro.
                </td>
              </tr>
            )}
            {ordenes.map((orden) => (
              <tr key={orden.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-900">
                  <Link href={`/ordenes/${orden.id}`} className="hover:underline">
                    {orden.numero_orden}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(orden.created_at).toLocaleDateString('es-CL')}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {orden.cliente?.nombre_razon_social ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <div>{orden.maquina?.nombre ?? '—'}</div>
                  {orden.maquina?.modelo && (
                    <div className="text-xs text-gray-400">{orden.maquina.modelo}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={orden.estado} />
                </td>
                <td className="px-4 py-3 text-gray-600">{orden.tecnico?.nombre ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-500">
        <span>
          Mostrando {from} a {to} de {total} resultados
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => updateParams({ page: String(page - 1) })}
            className="rounded-md border border-gray-300 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹
          </button>
          <span className="px-2">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => updateParams({ page: String(page + 1) })}
            className="rounded-md border border-gray-300 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}