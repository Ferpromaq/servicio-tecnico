import { NextRequest, NextResponse } from "next/server";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { createClient } from "@/lib/supabase/server";
import { construirCorreoSolicitudCliente } from "./plantilla";

// Ubicación: app/(app)/repuestos/solicitud-cliente/route.ts
// Ruta pública resultante: POST /repuestos/solicitud-cliente
//
// Body: { ordenId: string, repuestoIds: string[] }
//
// Cliente, máquina, repuestos y valores se leen desde la base de datos en
// el servidor: el navegador no decide a quién se envía ni qué montos salen.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const ordenId =
      typeof body?.ordenId === "string" ? body.ordenId.trim() : "";

    const repuestoIds: string[] = Array.isArray(body?.repuestoIds)
      ? body.repuestoIds.filter((id: unknown) => typeof id === "string")
      : [];

    if (!ordenId || repuestoIds.length === 0) {
      return NextResponse.json(
        { error: "Faltan ordenId o repuestoIds." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // -------------------------------------------------------------
    // USUARIO ACTUAL
    // -------------------------------------------------------------

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Usuario no autenticado." },
        { status: 401 },
      );
    }

    // -------------------------------------------------------------
    // ORDEN + CLIENTE + MÁQUINA
    // -------------------------------------------------------------

    const { data: ordenRaw, error: ordenError } = await supabase
      .from("ordenes_servicio")
      .select(
        `
        id,
        numero_orden,
        cliente:clientes (
          nombre_razon_social,
          correo
        ),
        maquina:maquinas (
          nombre,
          modelo
        )
        `,
      )
      .eq("id", ordenId)
      .single();

    if (ordenError || !ordenRaw) {
      console.error("Error obteniendo orden:", ordenError);

      return NextResponse.json(
        { error: "No se encontró la orden." },
        { status: 404 },
      );
    }

    const cliente = Array.isArray(ordenRaw.cliente)
      ? (ordenRaw.cliente[0] ?? null)
      : ordenRaw.cliente;

    const maquina = Array.isArray(ordenRaw.maquina)
      ? (ordenRaw.maquina[0] ?? null)
      : ordenRaw.maquina;

    const correoCliente = String(cliente?.correo ?? "").trim();

    if (!correoCliente) {
      return NextResponse.json(
        {
          error:
            "Los repuestos fueron registrados, pero el cliente no tiene un correo registrado.",
        },
        { status: 422 },
      );
    }

    // -------------------------------------------------------------
    // REPUESTOS (solo los de esta orden)
    // -------------------------------------------------------------

    const { data: repuestosDb, error: repuestosError } = await supabase
      .from("repuestos_solicitados")
      .select("id, nombre_repuesto, cantidad, valor")
      .eq("origen_tipo", "orden_servicio")
      .eq("origen_id", ordenId)
      .in("id", repuestoIds);

    if (repuestosError || !repuestosDb || repuestosDb.length === 0) {
      console.error("Error obteniendo repuestos:", repuestosError);

      return NextResponse.json(
        { error: "No se encontraron los repuestos de la solicitud." },
        { status: 404 },
      );
    }

    // -------------------------------------------------------------
    // ARMAR Y ENVIAR CORREO
    // -------------------------------------------------------------

    const nombreMaquina = maquina
      ? [maquina.nombre, maquina.modelo].filter(Boolean).join(" ")
      : "su máquina";

    const correo = construirCorreoSolicitudCliente({
      nombreCliente: cliente?.nombre_razon_social ?? "cliente",
      nombreMaquina,
      numeroOrden: ordenRaw.numero_orden,
      repuestos: repuestosDb.map((r) => ({
        nombre: r.nombre_repuesto,
        cantidad: Number(r.cantidad),
        valor: Number(r.valor),
      })),
    });

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: correoCliente,
      subject: correo.subject,
      html: correo.html,
      text: correo.text,
    });

    if (emailError) {
      console.error("Error enviando correo al cliente:", emailError);

      return NextResponse.json(
        {
          error: "No se pudo enviar el correo al cliente.",
          emailError,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      emailId: emailData?.id ?? null,
      correoCliente,
    });
  } catch (error) {
    console.error("Error API correo solicitud de repuestos al cliente:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor.",
      },
      { status: 500 },
    );
  }
}
