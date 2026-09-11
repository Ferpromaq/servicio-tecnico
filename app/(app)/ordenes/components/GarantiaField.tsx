import { cx } from "../nueva/utils";
import { inputBase } from "../nueva/constants";
import { Field } from "./Field";
import type { useGarantia } from "../hooks/useGarantia";

interface GarantiaFieldProps {
  state: ReturnType<typeof useGarantia>;
}

export function GarantiaField({ state }: GarantiaFieldProps) {
  const {
    tieneGarantia,
    setTieneGarantia,
    numeroBoletaCompra,
    setNumeroBoletaCompra,
    montoRevision,
    setMontoRevision,
    numeroBoletaRevision,
    setNumeroBoletaRevision,
  } = state;

  return (
    <Field label="¿La máquina tiene garantía?" required>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setTieneGarantia(true)}
          className={cx(
            "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition",
            tieneGarantia === true
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
              : "border-slate-700 text-slate-400 hover:border-slate-600"
          )}
        >
          Sí, tiene garantía
        </button>
        <button
          type="button"
          onClick={() => setTieneGarantia(false)}
          className={cx(
            "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition",
            tieneGarantia === false
              ? "border-orange-500 bg-orange-500/10 text-orange-400"
              : "border-slate-700 text-slate-400 hover:border-slate-600"
          )}
        >
          No tiene garantía
        </button>
      </div>

      {tieneGarantia === true && (
        <div className="mt-2">
          <input
            value={numeroBoletaCompra}
            onChange={(e) => setNumeroBoletaCompra(e.target.value)}
            placeholder="N° de boleta o factura de la máquina *"
            className={inputBase}
          />
        </div>
      )}

      {tieneGarantia === false && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="number"
            min={18000}
            max={30000}
            step={1000}
            value={montoRevision}
            onChange={(e) => setMontoRevision(e.target.value)}
            placeholder="Monto revisión *"
            className={inputBase}
          />
          <input
            value={numeroBoletaRevision}
            onChange={(e) => setNumeroBoletaRevision(e.target.value)}
            placeholder="N° boleta/factura pago *"
            className={inputBase}
          />
          <span className="col-span-2 text-[11px] text-slate-500">
            Rango sugerido: $18.000 – $30.000 según la máquina
          </span>
        </div>
      )}
    </Field>
  );
}
