  "use client";

  import { UserPlus, User } from "lucide-react";
  import { cx } from "../nueva/utils";
  import { inputBase } from "../nueva/constants";
  import { Field } from "./Field";
  import { PickerCard } from "./PickerCard";
  import { ClientePicker } from "./ClientePicker";
  import { esPendiente } from "../nueva/types";
  import type { useClienteSelection } from "../hooks/useClienteSelection";

  interface ClienteFieldProps {
    state: ReturnType<typeof useClienteSelection>;
  }

  /**
   * Sección "Cliente" completa: muestra la tarjeta seleccionada, el
   * buscador, o el mini-formulario de alta rápida, según el estado.
   */
  export function ClienteField({ state }: ClienteFieldProps) {
    const { cliente, creando, form, setForm, seleccionar, iniciarCreacion, cancelarCreacion, guardarNuevo, limpiar } =
      state;

    return (
      <Field label="Cliente" required>
        {cliente && !creando ? (
          <PickerCard
            icon={User}
            title={cliente.nombre_razon_social}
            subtitle={`${cliente.rut}${cliente.telefono ? " · " + cliente.telefono : ""}`}
            tag={esPendiente(cliente) ? "Nuevo" : null}
            onClear={limpiar}
          />
        ) : creando ? (
          <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-950/40 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-orange-400">
              <UserPlus size={13} /> Cliente nuevo
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={cx(inputBase, "col-span-2")}
                placeholder="Nombre o razón social *"
                value={form.nombre_razon_social}
                onChange={(e) => setForm({ ...form, nombre_razon_social: e.target.value })}
              />
              <input
                className={inputBase}
                placeholder="RUT *"
                value={form.rut}
                onChange={(e) => setForm({ ...form, rut: e.target.value })}
              />
              <input
                className={inputBase}
                placeholder="Teléfono *"
                value={form.telefono ?? ""}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
              <input
                className={inputBase}
                placeholder="Correo *"
                value={form.correo ?? ""}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
              />
              <input
                className={inputBase}
                placeholder="Ciudad *"
                value={form.ciudad ?? ""}
                onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
              />
              <input
                className={cx(inputBase, "col-span-2")}
                placeholder="Dirección *"
                value={form.direccion ?? ""}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
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
                Usar este cliente
              </button>
            </div>
          </div>
        ) : (
          <ClientePicker onSelect={seleccionar} onCreateNew={iniciarCreacion} />
        )}
      </Field>
    );
  }
