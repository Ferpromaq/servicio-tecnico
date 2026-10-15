// Para estados que no estén en los mapas de constants.ts (⚠️ agrega los que
// falten a medida que aparezcan), este fallback al menos los muestra legibles
// en vez del valor crudo del enum ("no_reparada" -> "No reparada").
export function formatEstadoFallback(estado: string) {
  return estado
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Formatea una fecha/hora para las marcas de "recibido" / "instalado".
export function formatFechaHora(fecha: string | null) {
  if (!fecha) return "—";

  return new Date(fecha).toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
