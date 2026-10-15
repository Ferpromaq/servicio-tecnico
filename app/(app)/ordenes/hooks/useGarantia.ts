import { useEffect, useState } from "react";
import type { MaquinaSeleccionada } from "../nueva/types";

/**
 * Estado de la sección de garantía. Si la máquina seleccionada ya
 * existía y ya tenía datos de garantía guardados, los precarga.
 */
export function useGarantia(
  maquina: MaquinaSeleccionada | null,
  creandoMaquina: boolean,
) {
  const [tieneGarantia, setTieneGarantia] = useState<boolean | null>(null);
  const [numeroBoletaCompra, setNumeroBoletaCompra] = useState("");
  const [montoRevision, setMontoRevision] = useState("");
  const [numeroBoletaRevision, setNumeroBoletaRevision] = useState("");

  useEffect(() => {
    if (maquina && !creandoMaquina && "tiene_garantia" in maquina) {
      setTieneGarantia(maquina.tiene_garantia ?? null);

      setNumeroBoletaCompra(
        maquina.numero_boleta_compra != null
          ? String(maquina.numero_boleta_compra)
          : "",
      );
    }
  }, [maquina, creandoMaquina]);

  const completa =
    tieneGarantia === true
      ? numeroBoletaCompra.trim().length > 0
      : tieneGarantia === false
        ? montoRevision !== "" &&
          numeroBoletaRevision.trim().length > 0
        : false;

  function reset() {
    setTieneGarantia(null);
    setNumeroBoletaCompra("");
    setMontoRevision("");
    setNumeroBoletaRevision("");
  }

  return {
    tieneGarantia,
    setTieneGarantia,
    numeroBoletaCompra,
    setNumeroBoletaCompra,
    montoRevision,
    setMontoRevision,
    numeroBoletaRevision,
    setNumeroBoletaRevision,
    completa,
    reset,
  };
}