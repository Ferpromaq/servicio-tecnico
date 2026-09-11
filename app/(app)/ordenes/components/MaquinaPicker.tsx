"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Plus, Wrench, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { useMaquinaSearch } from "../hooks/useMaquinaSearch";
import { inputBase } from "../nueva/constants";
import { cx } from "../nueva/utils";
import { Maquina } from "../nueva/types";

interface MaquinaPickerProps {
  clienteId?: string;
  onSelect: (maquina: Maquina) => void;
  onCreateNew: () => void;
}

export function MaquinaPicker({ clienteId, onSelect, onCreateNew }: MaquinaPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { query, setQuery, results, loading, error } = useMaquinaSearch(clienteId, open);

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
          placeholder="Buscar máquina del cliente..."
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
              <p className="px-3 py-3 text-xs text-slate-500">Este cliente no tiene máquinas registradas aún.</p>
            )}
            {results.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelect(m);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-slate-400">
                  <Wrench size={14} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.nombre}</p>
                  <p className="truncate text-xs text-slate-500">{m.modelo}</p>
                </div>
                {m.tiene_garantia && <ShieldCheck size={14} className="ml-auto shrink-0 text-emerald-400" />}
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
            Registrar máquina nueva
          </button>
        </div>
      )}
    </div>
  );
}
