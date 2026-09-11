import { inputBase } from "../nueva/constants";
import type { Maquina } from "../nueva/types";

/** Datos de solo lectura de una máquina ya existente (marca, serie, boleta). */
export function MaquinaDetalleReadonly({ maquina }: { maquina: Maquina }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Marca</span>
          <input className={inputBase} value={maquina.marca ?? ""} readOnly />
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Serie</span>
          <input className={inputBase} value={maquina.numero_serie ?? ""} readOnly />
        </div>
        <div className="col-span-2">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Boleta compra
          </span>
          <input className={inputBase} value={maquina.numero_boleta_compra ?? ""} readOnly />
        </div>
      </div>
    </div>
  );
}
