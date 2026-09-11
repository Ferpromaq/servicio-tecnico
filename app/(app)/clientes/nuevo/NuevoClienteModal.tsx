"use client";

import {
  AlertCircle,
  X,
  CheckCircle2,
  Search,
  Loader2,
  Building2,
  User,
  Info,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

const supabase = createClient();

interface NuevoClienteModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}

type TipoCliente = "persona" | "empresa";

interface ClienteExistente {
  id?: string;
  nombre_razon_social?: string | null;
  rut?: string | null;
  tipo_cliente?: TipoCliente | null;
  giro?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
}

export default function NuevoClienteModal({
  open,
  onClose,
  onCreated,
}: NuevoClienteModalProps) {
  const [nombreRazonSocial, setNombreRazonSocial] =
    useState("");

  const [rut, setRut] = useState("");

  const [tipoCliente, setTipoCliente] =
    useState<TipoCliente>("persona");

  const [giro, setGiro] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [buscandoRut, setBuscandoRut] = useState(false);
  const [done, setDone] = useState(false);

  const [error, setError] = useState<string | null>(
    null,
  );

  /**
   * ID del cliente encontrado en Supabase.
   *
   * Si tiene valor:
   * → estamos editando/actualizando.
   *
   * Si es null:
   * → estamos creando un cliente nuevo.
   */
  const [clienteExistenteId, setClienteExistenteId] =
    useState<string | null>(null);

  /**
   * Controla el mensaje amarillo cuando SRE
   * no encuentra un RUT.
   */
  const [rutNoEncontrado, setRutNoEncontrado] =
    useState("");

  const puedeCrear =
    nombreRazonSocial.trim().length > 0 &&
    rut.trim().length > 0;

  /**
   * ============================================================
   * FORMATEAR RUT
   *
   * 123456789    → 12345678-9
   * 12.345.678-9 → 12345678-9
   * ============================================================
   */
  function formatearRut(valor: string) {
    let limpio = valor
      .replace(/\./g, "")
      .replace(/-/g, "")
      .replace(/\s/g, "")
      .toUpperCase();

    limpio = limpio.replace(/[^0-9K]/g, "");

    if (limpio.length > 9) {
      limpio = limpio.slice(0, 9);
    }

    if (limpio.length <= 1) {
      return limpio;
    }

    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);

    return `${cuerpo}-${dv}`;
  }

  /**
   * ============================================================
   * LIMPIAR DATOS DEL CLIENTE
   * ============================================================
   */
  function limpiarDatosCliente() {
    setNombreRazonSocial("");
    setTipoCliente("persona");
    setGiro("");
    setTelefono("");
    setCorreo("");
    setDireccion("");
    setCiudad("");

    setClienteExistenteId(null);
  }

  /**
   * ============================================================
   * RESET COMPLETO
   * ============================================================
   */
  function resetAll() {
    setNombreRazonSocial("");
    setRut("");

    setTipoCliente("persona");

    setGiro("");
    setTelefono("");
    setCorreo("");
    setDireccion("");
    setCiudad("");

    setSubmitting(false);
    setBuscandoRut(false);
    setDone(false);

    setError(null);

    setClienteExistenteId(null);
    setRutNoEncontrado("");
  }

  function handleClose() {
    if (submitting || buscandoRut) {
      return;
    }

    onClose();

    setTimeout(() => {
      resetAll();
    }, 200);
  }

  /**
   * ============================================================
   * CARGAR CLIENTE EXISTENTE
   * ============================================================
   */
  function cargarCliente(
    cliente: ClienteExistente,
  ) {
    setClienteExistenteId(
      cliente.id ?? null,
    );

    setNombreRazonSocial(
      cliente.nombre_razon_social ?? "",
    );

    setRut(
      formatearRut(cliente.rut ?? ""),
    );

    const tipo =
      cliente.tipo_cliente === "empresa"
        ? "empresa"
        : "persona";

    setTipoCliente(tipo);

    if (tipo === "empresa") {
      setGiro(cliente.giro ?? "");
    } else {
      setGiro("");
    }

    setTelefono(cliente.telefono ?? "");
    setCorreo(cliente.correo ?? "");
    setDireccion(cliente.direccion ?? "");
    setCiudad(cliente.ciudad ?? "");

    setRutNoEncontrado("");
    setError(null);
  }

  /**
   * ============================================================
   * DETECTAR TIPO DE CLIENTE
   * ============================================================
   */
  function detectarTipoCliente(
    empresa: any,
  ): TipoCliente {
    const valores = [
      empresa?.tipo,
      empresa?.tipo_cliente,
      empresa?.tipoCliente,
      empresa?.tipo_contribuyente,
      empresa?.tipoContribuyente,
      empresa?.tipo_persona,
      empresa?.tipoPersona,
      empresa?.categoria,
      empresa?.categoria_contribuyente,
      empresa?.categoriaContribuyente,
    ];

    const texto = valores
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (
      texto.includes("empresa") ||
      texto.includes("sociedad") ||
      texto.includes("spa") ||
      texto.includes("limitada") ||
      texto.includes("ltda") ||
      texto.includes("s.a.") ||
      texto.includes("s.a") ||
      texto.includes("eirl") ||
      texto.includes("comercial")
    ) {
      return "empresa";
    }

    if (
      texto.includes("persona natural") ||
      texto.includes("natural") ||
      texto.includes("individual")
    ) {
      return "persona";
    }

    const nombre = String(
      empresa?.razon_social ??
        empresa?.razonSocial ??
        empresa?.nombre_razon_social ??
        empresa?.nombreEmpresa ??
        empresa?.nombre ??
        "",
    ).toLowerCase();

    if (
      nombre.includes(" spa") ||
      nombre.endsWith("spa") ||
      nombre.includes(" ltda") ||
      nombre.includes(" limitada") ||
      nombre.includes(" eirl") ||
      nombre.includes(" s.a.") ||
      nombre.includes(" s.a ")
    ) {
      return "empresa";
    }

    return "persona";
  }

  /**
   * ============================================================
   * BUSCAR POR RUT
   *
   * 1. Supabase
   * 2. Si no existe → SRE
   * ============================================================
   */
  async function buscarPorRut() {
    const rutActual = formatearRut(rut);

    if (!rutActual) {
      setError(
        "Ingresa un RUT antes de buscar.",
      );
      return;
    }

    if (
      rutNoEncontrado &&
      rutNoEncontrado === rutActual
    ) {
      return;
    }

    setBuscandoRut(true);
    setError(null);

    try {
      /**
       * ========================================================
       * 1. BUSCAR EN SUPABASE
       * ========================================================
       */
      const {
        data: clienteExistente,
        error: errorSupabase,
      } = await supabase
        .from("clientes")
        .select(
          `
            id,
            nombre_razon_social,
            rut,
            tipo_cliente,
            giro,
            telefono,
            correo,
            direccion,
            ciudad
          `,
        )
        .eq("rut", rutActual)
        .maybeSingle();

      if (errorSupabase) {
        console.error(
          "Error buscando cliente en Supabase:",
          errorSupabase,
        );

        throw new Error(
          "No fue posible consultar los clientes registrados.",
        );
      }

      /**
       * ========================================================
       * CLIENTE YA EXISTE
       *
       * NO gastamos tokens de SRE.
       * ========================================================
       */
      if (clienteExistente) {
        cargarCliente(
          clienteExistente,
        );

        return;
      }

      /**
       * ========================================================
       * NO EXISTE EN SUPABASE
       *
       * Consultamos SRE.
       * ========================================================
       */
      const response = await fetch(
        "/api/clientes/buscar-rut",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            rut: rutActual,
          }),
        },
      );

      const texto =
        await response.text();

      let data;

      try {
        data = JSON.parse(texto);
      } catch {
        throw new Error(
          "El servidor no devolvió una respuesta JSON válida.",
        );
      }

      /**
       * ========================================================
       * RUT NO ENCONTRADO
       * ========================================================
       */
      if (
        !response.ok ||
        data?.found === false ||
        data?.exists === false ||
        data?.notFound === true
      ) {
        limpiarDatosCliente();

        setRut(
          rutActual,
        );

        setRutNoEncontrado(
          rutActual,
        );

        setError(null);

        return;
      }

      /**
       * ========================================================
       * DATOS SRE
       * ========================================================
       */
      const empresa =
        data?.data ?? data;

      const tipoDetectado =
        detectarTipoCliente(
          empresa,
        );

      setTipoCliente(
        tipoDetectado,
      );

      /**
       * ========================================================
       * NOMBRE
       * ========================================================
       */
      const nombre =
        empresa?.nombre_razon_social ??
        empresa?.razon_social ??
        empresa?.razonSocial ??
        empresa?.nombre ??
        empresa?.nombre_empresa ??
        empresa?.nombreEmpresa ??
        "";

      setNombreRazonSocial(
        nombre
          ? String(nombre)
          : "",
      );

      /**
       * ========================================================
       * GIRO
       * ========================================================
       */
      if (
        tipoDetectado ===
        "empresa"
      ) {
        const nuevoGiro =
          empresa?.giro ??
          empresa?.actividad_economica ??
          empresa?.actividadEconomica ??
          empresa?.actividad ??
          empresa?.giro_comercial ??
          empresa?.giroComercial ??
          "";

        setGiro(
          nuevoGiro
            ? String(nuevoGiro)
            : "",
        );
      } else {
        setGiro("");
      }

      /**
       * ========================================================
       * DIRECCIÓN
       * ========================================================
       */
      const nuevaDireccion =
        empresa?.direccion ??
        empresa?.domicilio ??
        empresa?.address ??
        "";

      setDireccion(
        nuevaDireccion
          ? String(nuevaDireccion)
          : "",
      );

      /**
       * ========================================================
       * CIUDAD
       * ========================================================
       */
      const nuevaCiudad =
        empresa?.ciudad ??
        empresa?.comuna ??
        empresa?.nombre_comuna ??
        empresa?.nombreComuna ??
        empresa?.city ??
        "";

      setCiudad(
        nuevaCiudad
          ? String(nuevaCiudad)
          : "",
      );

      /**
       * ========================================================
       * CORREO
       * ========================================================
       */
      const nuevoCorreo =
        empresa?.correo ??
        empresa?.email ??
        empresa?.email_dte ??
        empresa?.emailDte ??
        empresa?.mail ??
        "";

      setCorreo(
        nuevoCorreo
          ? String(nuevoCorreo)
          : "",
      );

      /**
       * ========================================================
       * TELÉFONO
       * ========================================================
       */
      const nuevoTelefono =
        empresa?.telefono ??
        empresa?.phone ??
        empresa?.telefono_contacto ??
        empresa?.telefonoContacto ??
        "";

      setTelefono(
        nuevoTelefono
          ? String(nuevoTelefono)
          : "",
      );

      /**
       * ========================================================
       * RUT
       * ========================================================
       */
      const rutApi =
        empresa?.rut ??
        empresa?.RUT ??
        empresa?.rut_empresa ??
        "";

      setRut(
        formatearRut(
          rutApi || rutActual,
        ),
      );

      /**
       * SRE respondió pero no entregó datos útiles.
       */
      const encontroDatos =
        nombre ||
        nuevoCorreo ||
        nuevaDireccion ||
        nuevaCiudad ||
        nuevoTelefono ||
        rutApi;

      if (!encontroDatos) {
        limpiarDatosCliente();

        setRut(
          rutActual,
        );

        setRutNoEncontrado(
          rutActual,
        );

        setError(null);
      }
    } catch (err) {
      console.error(
        "Error buscando RUT:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al buscar el RUT.",
      );
    } finally {
      setBuscandoRut(false);
    }
  }

  /**
   * ============================================================
   * CREAR / ACTUALIZAR CLIENTE
   * ============================================================
   */
  async function handleSubmit() {
    if (
      !puedeCrear ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const datosCliente = {
        nombre_razon_social:
          nombreRazonSocial.trim(),

        rut: formatearRut(rut),

        tipo_cliente:
          tipoCliente,

        giro:
          tipoCliente ===
          "empresa"
            ? giro.trim() || null
            : null,

        telefono:
          telefono.trim() || null,

        correo:
          correo.trim() || null,

        direccion:
          direccion.trim() || null,

        ciudad:
          ciudad.trim() || null,
      };

      /**
       * ========================================================
       * ACTUALIZAR
       * ========================================================
       */
      if (clienteExistenteId) {
        const {
          error: updateError,
        } = await supabase
          .from("clientes")
          .update(datosCliente)
          .eq(
            "id",
            clienteExistenteId,
          );

        if (updateError) {
          setError(
            updateError.message,
          );

          return;
        }
      }

      /**
       * ========================================================
       * CREAR
       * ========================================================
       */
      else {
        const {
          error: insertError,
        } = await supabase
          .from("clientes")
          .insert(
            datosCliente,
          );

        if (insertError) {
          setError(
            insertError.code ===
              "23505"
              ? "Ya existe un cliente con ese RUT."
              : insertError.message,
          );

          return;
        }
      }

      setDone(true);

      await onCreated();
    } catch (err) {
      console.error(
        "Error guardando cliente:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al guardar el cliente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  const rutYaNoEncontrado =
    rutNoEncontrado &&
    rutNoEncontrado ===
      formatearRut(rut);

  const modoEdicion =
    clienteExistenteId !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">

      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/60">

        {/* ======================================================
            HEADER
        ======================================================= */}

        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

          <h2 className="text-sm font-semibold text-white">
            Nuevo Cliente
          </h2>

          <button
            onClick={handleClose}
            disabled={
              submitting ||
              buscandoRut
            }
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>

        </div>

        {done ? (
          /* ====================================================
             GUARDADO
          ===================================================== */

          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">

              <CheckCircle2
                size={26}
                className="text-green-500"
              />

            </div>

            <div>

              <p className="text-sm font-medium text-white">

                {modoEdicion
                  ? "Cliente actualizado"
                  : "Cliente creado"}

              </p>

              <p className="mt-1 text-xs text-slate-400">
                {nombreRazonSocial} ·{" "}
                {rut}
              </p>

            </div>

            <button
              onClick={handleClose}
              className="mt-2 rounded-lg bg-orange-600 px-4 py-2 text-xs font-medium text-white hover:bg-orange-700"
            >
              Cerrar
            </button>

          </div>
        ) : (
          <>
            {/* ==================================================
                FORMULARIO
            =================================================== */}

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">

              {/* =================================================
                  RUT
              ================================================== */}

              <div>

                <label className="mb-1 block text-xs font-medium text-slate-400">
                  RUT *
                </label>

                <div className="flex gap-2">

                  <input
                    value={rut}
                    onChange={(e) => {
                      const nuevoRut =
                        formatearRut(
                          e.target.value,
                        );

                      setRut(
                        nuevoRut,
                      );

                      /**
                       * Al cambiar el RUT,
                       * dejamos de considerar el
                       * cliente anterior como seleccionado.
                       *
                       * Esto es MUY importante:
                       *
                       * Si cambias el RUT, no debemos
                       * actualizar accidentalmente
                       * el cliente anterior.
                       */
                      setClienteExistenteId(
                        null,
                      );

                      if (
                        rutNoEncontrado &&
                        nuevoRut !==
                          rutNoEncontrado
                      ) {
                        setRutNoEncontrado(
                          "",
                        );
                      }

                      setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (
                        e.key ===
                        "Enter"
                      ) {
                        e.preventDefault();

                        if (
                          !rutYaNoEncontrado
                        ) {
                          buscarPorRut();
                        }
                      }
                    }}
                    placeholder="Ej: 76883241-2"
                    disabled={
                      buscandoRut ||
                      submitting
                    }
                    className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={
                      buscarPorRut
                    }
                    disabled={
                      !rut.trim() ||
                      buscandoRut ||
                      submitting ||
                      !!rutYaNoEncontrado
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >

                    {buscandoRut ? (
                      <>
                        <Loader2
                          size={14}
                          className="animate-spin"
                        />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search
                          size={14}
                        />
                        Buscar
                      </>
                    )}

                  </button>

                </div>

                {/* RUT NO ENCONTRADO */}

                {rutYaNoEncontrado && (
                  <p className="mt-1.5 text-[11px] text-yellow-400">
                    No se encontró información para este RUT.
                  </p>
                )}

                {/* CLIENTE EXISTENTE */}

                {modoEdicion && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-blue-900/60 bg-blue-950/30 px-3 py-2">

                    <Info
                      size={14}
                      className="mt-0.5 shrink-0 text-blue-400"
                    />

                    <p className="text-[11px] leading-relaxed text-blue-300">
                      Este cliente ya está registrado. Puedes modificar sus datos y actualizar la información.
                    </p>

                  </div>
                )}

                <p className="mt-1.5 text-[11px] text-slate-500">
                  Puedes escribir el RUT con o sin puntos y guion.
                </p>

              </div>

              {/* =================================================
                  TIPO CLIENTE
              ================================================== */}

              <div>

                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Tipo de cliente
                </label>

                <div
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                    tipoCliente ===
                    "empresa"
                      ? "border-orange-500/40 bg-orange-500/10 text-orange-400"
                      : "border-slate-700 bg-slate-800 text-slate-300"
                  }`}
                >

                  {tipoCliente ===
                  "empresa" ? (
                    <>
                      <Building2
                        size={15}
                      />
                      Empresa
                    </>
                  ) : (
                    <>
                      <User size={15} />
                      Persona natural
                    </>
                  )}

                </div>

              </div>

              {/* =================================================
                  NOMBRE
              ================================================== */}

              <div>

                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Nombre / Razón Social *
                </label>

                <input
                  value={
                    nombreRazonSocial
                  }
                  onChange={(e) =>
                    setNombreRazonSocial(
                      e.target.value,
                    )
                  }
                  placeholder="Ej: Juan Pablo Marín"
                  disabled={submitting}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                />

              </div>

              {/* =================================================
                  GIRO
              ================================================== */}

              {tipoCliente ===
                "empresa" && (
                <div>

                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Giro
                  </label>

                  <input
                    value={giro}
                    onChange={(e) =>
                      setGiro(
                        e.target.value,
                      )
                    }
                    placeholder="Ej: Venta de materiales de construcción"
                    disabled={submitting}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                  />

                </div>
              )}

              {/* =================================================
                  TELÉFONO / CORREO
              ================================================== */}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                <div>

                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Teléfono
                  </label>

                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) =>
                      setTelefono(
                        e.target.value,
                      )
                    }
                    disabled={submitting}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                  />

                </div>

                <div>

                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Correo
                  </label>

                  <input
                    type="email"
                    value={correo}
                    onChange={(e) =>
                      setCorreo(
                        e.target.value,
                      )
                    }
                    disabled={submitting}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                  />

                </div>

              </div>

              {/* =================================================
                  DIRECCIÓN
              ================================================== */}

              <div>

                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Dirección
                </label>

                <input
                  value={direccion}
                  onChange={(e) =>
                    setDireccion(
                      e.target.value,
                    )
                  }
                  disabled={submitting}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                />

              </div>

              {/* =================================================
                  CIUDAD
              ================================================== */}

              <div>

                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Ciudad / Comuna
                </label>

                <input
                  value={ciudad}
                  onChange={(e) =>
                    setCiudad(
                      e.target.value,
                    )
                  }
                  disabled={submitting}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                />

              </div>

              {/* =================================================
                  ERROR
              ================================================== */}

              {error && (
                <p className="flex items-start gap-1.5 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-400">

                  <AlertCircle
                    size={13}
                    className="mt-0.5 shrink-0"
                  />

                  {error}

                </p>
              )}

            </div>

            {/* ==================================================
                FOOTER
            =================================================== */}

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-5 py-4">

              <button
                onClick={handleClose}
                disabled={
                  submitting ||
                  buscandoRut
                }
                className="rounded-lg px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={
                  handleSubmit
                }
                disabled={
                  !puedeCrear ||
                  submitting ||
                  buscandoRut
                }
                className={`rounded-lg px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  modoEdicion
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-orange-600 hover:bg-orange-700"
                }`}
              >
                {submitting
                  ? modoEdicion
                    ? "Actualizando..."
                    : "Creando..."
                  : modoEdicion
                    ? "Actualizar Cliente"
                    : "Crear Cliente"}
              </button>

            </div>
          </>
        )}
      </div>
    </div>
  );
}