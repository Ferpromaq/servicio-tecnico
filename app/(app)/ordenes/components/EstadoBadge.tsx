import { ESTADO_LABELS, ESTADO_STYLES } from "../lib/constants";
import { formatEstadoFallback } from "../lib/utils";

// Badge de estado (orden)
export default function EstadoBadge({ estado }: { estado: string }) {
  const style = ESTADO_STYLES[estado] ?? "bg-gray-100 text-gray-600";
  const label = ESTADO_LABELS[estado] ?? formatEstadoFallback(estado);
  return (
    <span
      className={`inline-flex flex-shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium ${style}`}
    >
      {label}
    </span>
  );
}
