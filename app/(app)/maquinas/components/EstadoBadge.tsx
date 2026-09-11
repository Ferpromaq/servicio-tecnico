interface EstadoBadgeProps {
  estado: string;
}

const ESTADO_STYLES: Record<string, string> = {
  Activa: "bg-orange-100 text-orange-700",
  "En Reparación": "bg-orange-100 text-orange-700",
};

const DEFAULT_STYLE = "bg-amber-100 text-amber-700";

export function EstadoBadge({ estado }: EstadoBadgeProps) {
  const style = ESTADO_STYLES[estado] ?? DEFAULT_STYLE;

  return (
    <span
      className={`inline-block whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${style}`}
    >
      {estado}
    </span>
  );
}