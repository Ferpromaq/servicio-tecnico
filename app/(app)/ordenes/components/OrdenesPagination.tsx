import type { Dispatch, SetStateAction } from "react";

export default function OrdenesPagination({
  page,
  setPage,
  totalPages,
  from,
  to,
  total,
}: {
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
  from: number;
  to: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-1 text-xs text-gray-400">
      <span>
        Mostrando {from} a {to} de {total} resultados
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="rounded-md border border-gray-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹
        </button>
        <span className="px-2">
          {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-md border border-gray-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}
