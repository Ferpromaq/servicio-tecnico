"use client";

import { PackagePlus, Wrench } from "lucide-react";
import { Field } from "./Field";
import { PickerCard } from "./PickerCard";
import { MaquinaPicker } from "./MaquinaPicker";
import { MaquinaDetalleReadonly } from "./MaquinaDetalleReadonly";
import type { useMaquinaSelection } from "../hooks/useMaquinaSelection";
import { cx } from "../nueva/utils";
import { esPendiente } from "../nueva/types";
import { inputBase } from "../nueva/constants";

interface MaquinaFieldProps {
  state: ReturnType<typeof useMaquinaSelection>;
  clienteId?: string;
  disabled: boolean;
}

export function MaquinaField({ state, clienteId, disabled }: MaquinaFieldProps) {
  const { maquina, creando, form, setForm, seleccionar, iniciarCreacion, cancelarCreacion, guardarNuevo, limpiar } =
    state;

  return (
    <Field label="Máquina" required hint={disabled ? "Selecciona un cliente primero" : undefined}>
      <fieldset disabled={disabled} className={cx(disabled && "pointer-events-none opacity-40")}>
        {maquina && !creando ? (
          <div className="space-y-2">
            <PickerCard
              icon={Wrench}
              title={maquina.nombre}
              subtitle={maquina.modelo}
              tag={esPendiente(maquina) ? "Nueva" : null}
              onClear={limpiar}
            />
            {!esPendiente(maquina) && <MaquinaDetalleReadonly maquina={maquina} />}
          </div>
        ) : creando ? (
          <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-950/40 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-orange-400">
              <PackagePlus size={13} /> Máquina nueva
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={inputBase}
                placeholder="Nombre de la máquina *"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              <input
                className={inputBase}
                placeholder="Modelo *"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              />
              <input
                className={inputBase}
                placeholder="Marca"
                value={form.marca ?? ""}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
              />
              <input
                className={inputBase}
                placeholder="Número de serie"
                value={form.numero_serie ?? ""}
                onChange={(e) => setForm({ ...form, numero_serie: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={cancelarCreacion}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarNuevo}
                className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500"
              >
                Usar esta máquina
              </button>
            </div>
          </div>
        ) : (
          <MaquinaPicker clienteId={clienteId} onSelect={seleccionar} onCreateNew={iniciarCreacion} />
        )}
      </fieldset>
    </Field>
  );
}
