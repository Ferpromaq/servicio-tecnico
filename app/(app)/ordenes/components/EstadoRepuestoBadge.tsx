import {
  ESTADO_REPUESTO_LABELS,
  ESTADO_REPUESTO_STYLES,
} from "../lib/constants";
import type { EstadoRepuesto } from "../lib/types";
import { formatEstadoFallback } from "../lib/utils";

export default function EstadoRepuestoBadge({
  estado,
}: {
  estado: EstadoRepuesto;
}) {
  const style =
    ESTADO_REPUESTO_STYLES[estado] ?? "bg-gray-100 text-gray-600 ring-gray-200";
  const label = ESTADO_REPUESTO_LABELS[estado] ?? formatEstadoFallback(estado);

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}
