"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Plus, User, Loader2, AlertCircle } from "lucide-react";
import { cx } from "../nueva/utils";
import { inputBase } from "../nueva/constants";
import { useClienteSearch } from "../hooks/useClienteSearch";
import { Cliente } from "@/types";

interface ClientePickerProps {
  onSelect: (cliente: Cliente) => void;
  onCreateNew: () => void;
}

export function ClientePicker({ onSelect, onCreateNew }: ClientePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { query, setQuery, results, loading, error } = useClienteSearch(open);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar por nombre o RUT..."
          className={cx(inputBase, "pl-8")}
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-500" />
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl shadow-black/40">
          <div className="max-h-52 overflow-y-auto py-1">
            {error && (
              <p className="flex items-center gap-1.5 px-3 py-3 text-xs text-red-400">
                <AlertCircle size={13} /> No se pudo conectar a Supabase: {error}
              </p>
            )}
            {!error && !loading && results.length === 0 && (
              <p className="px-3 py-3 text-xs text-slate-500">Sin resultados para &quot;{query}&quot;.</p>
            )}
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelect(c);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-slate-400">
                  <User size={14} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.nombre_razon_social}</p>
                  <p className="truncate text-xs text-slate-500">{c.rut}</p>
                </div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              onCreateNew();
              setOpen(false);
              setQuery("");
            }}
            className="flex w-full items-center gap-2 border-t border-slate-800 bg-slate-950/60 px-3 py-2.5 text-left text-sm font-medium text-orange-400 transition hover:bg-slate-800"
          >
            <Plus size={15} />
            Registrar cliente nuevo
          </button>
        </div>
      )}
    </div>
  );
}
