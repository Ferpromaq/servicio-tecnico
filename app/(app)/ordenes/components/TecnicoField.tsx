import { UserRound, Loader2 } from "lucide-react";
import { cx } from "../nueva/utils";
import { inputBase } from "../nueva/constants";
import { Field } from "./Field";
import type { useTecnicoSelection } from "../hooks/useTecnicoSelection";

interface TecnicoFieldProps {
  state: ReturnType<typeof useTecnicoSelection>;
}

export function TecnicoField({ state }: TecnicoFieldProps) {
  const {
    tecnicos,
    tecnico,
    setTecnico,
    loading,
    error,
  } = state;

  return (
    <Field label="Técnico asignado" required>
      <div className="relative">
        <UserRound
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />

        <select
          value={tecnico?.id ?? ""}
          onChange={(e) => {
            const seleccionado =
              tecnicos.find((t) => t.id === e.target.value) ?? null;

            setTecnico(seleccionado);
          }}
          disabled={loading}
          className={cx(
            inputBase,
            "w-full appearance-none pl-9",
            loading && "opacity-60"
          )}
        >
          <option value="">
            {loading ? "Cargando técnicos..." : "Seleccionar técnico..."}
          </option>

          {tecnicos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-1 text-[11px] text-red-400">
          No se pudieron cargar los técnicos.
        </p>
      )}
    </Field>
  );
}