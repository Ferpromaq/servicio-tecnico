import { cx } from "../nueva/utils";
import { inputBase } from "../nueva/constants";
import { Field } from "./Field";

interface DescripcionFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function DescripcionField({ value, onChange }: DescripcionFieldProps) {
  return (
    <Field label="Descripción del daño o cómo llega el equipo" required>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ej. Motor no enciende, presenta fuga de aceite en la base..."
        className={cx(inputBase, "resize-none")}
      />
    </Field>
  );
}
