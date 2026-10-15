import { NextRequest, NextResponse } from "next/server";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { createClient } from "@/lib/supabase/server";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const ordenId =
      typeof body?.ordenId === "string" ? body.ordenId.trim() : "";

    if (!ordenId) {
      return NextResponse.json(
        { error: "Falta el ID de la orden." },
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
    // OBTENER ORDEN + CLIENTE + MÁQUINA + TÉCNICO
    // -------------------------------------------------------------

    const { data: ordenRaw, error: ordenError } = await supabase
      .from("ordenes_servicio")
      .select(
        `
        id,
        numero_orden,
        estado,
        created_at,
        updated_at,
        cliente:clientes (
          nombre_razon_social,
          rut,
          telefono,
          correo,
          direccion
        ),
        maquina:maquinas (
          nombre,
          marca,
          modelo,
          numero_serie,
          tipo
        ),
        tecnico:usuarios!ordenes_servicio_tecnico_id_fkey (
          nombre,
          telefono
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

    // -------------------------------------------------------------
    // VALIDAR ESTADO
    // -------------------------------------------------------------

    if (ordenRaw.estado !== "lista_para_entrega") {
      return NextResponse.json(
        {
          error: "La orden todavía no está en estado 'Lista para Entrega'.",
        },
        { status: 409 },
      );
    }

    // -------------------------------------------------------------
    // NORMALIZAR RELACIONES
    // -------------------------------------------------------------

    const cliente = Array.isArray(ordenRaw.cliente)
      ? (ordenRaw.cliente[0] ?? null)
      : ordenRaw.cliente;

    const maquina = Array.isArray(ordenRaw.maquina)
      ? (ordenRaw.maquina[0] ?? null)
      : ordenRaw.maquina;

    const tecnico = Array.isArray(ordenRaw.tecnico)
      ? (ordenRaw.tecnico[0] ?? null)
      : ordenRaw.tecnico;

    // -------------------------------------------------------------
    // VALIDAR CORREO DEL CLIENTE
    // -------------------------------------------------------------

    const correoCliente = String(cliente?.correo ?? "").trim();

    if (!correoCliente) {
      return NextResponse.json(
        {
          error:
            "La máquina quedó lista para entregar, pero el cliente no tiene un correo registrado.",
        },
        { status: 422 },
      );
    }

    // -------------------------------------------------------------
    // ENVIAR CORREO
    // -------------------------------------------------------------

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: correoCliente,
      subject: `Máquina lista para entregar — Orden ${ordenRaw.numero_orden}`,
      html: `
          <div
            style="
              font-family:Arial,sans-serif;
              max-width:700px;
              margin:0 auto;
              color:#1f2937;
              background:#ffffff;
            "
          >

            <div
              style="
                background:#ea580c;
                color:#ffffff;
                padding:24px;
                border-radius:10px 10px 0 0;
              "
            >
              <h2 style="margin:0 0 6px 0;">
                Máquina lista para entregar
              </h2>

              <p style="margin:0;color:#ffedd5;">
                Su equipo ya se encuentra disponible para retiro.
              </p>
            </div>

            <div style="padding:24px;">

              <!-- ORDEN -->

              <div
                style="
                  background:#f9fafb;
                  border:1px solid #e5e7eb;
                  border-radius:8px;
                  padding:16px;
                  margin-bottom:20px;
                "
              >
                <h3 style="margin-top:0;">
                  Orden de Servicio
                </h3>

                <p>
                  <strong>N° Orden:</strong>
                  ${escapeHtml(ordenRaw.numero_orden)}
                </p>

                <p>
                  <strong>Estado:</strong>
                  Máquina lista para entregar
                </p>

                <p>
                  <strong>Fecha:</strong>
                  ${new Date().toLocaleString("es-CL", {
                    timeZone: "America/Santiago",
                  })}
                </p>
              </div>

              <!-- CLIENTE -->

              <div
                style="
                  background:#f9fafb;
                  border:1px solid #e5e7eb;
                  border-radius:8px;
                  padding:16px;
                  margin-bottom:20px;
                "
              >
                <h3 style="margin-top:0;">
                  Cliente
                </h3>

                <p>
                  <strong>Nombre:</strong>
                  ${escapeHtml(cliente?.nombre_razon_social ?? "—")}
                </p>

                <p>
                  <strong>RUT:</strong>
                  ${escapeHtml(cliente?.rut ?? "—")}
                </p>

                <p>
                  <strong>Teléfono:</strong>
                  ${escapeHtml(cliente?.telefono ?? "—")}
                </p>

                <p>
                  <strong>Correo:</strong>
                  ${escapeHtml(cliente?.correo ?? "—")}
                </p>
              </div>

              <!-- MÁQUINA -->

              <div
                style="
                  background:#f9fafb;
                  border:1px solid #e5e7eb;
                  border-radius:8px;
                  padding:16px;
                  margin-bottom:20px;
                "
              >
                <h3 style="margin-top:0;">
                  Máquina
                </h3>

                <p>
                  <strong>Equipo:</strong>
                  ${escapeHtml(maquina?.nombre ?? "—")}
                </p>

                <p>
                  <strong>Marca:</strong>
                  ${escapeHtml(maquina?.marca ?? "—")}
                </p>

                <p>
                  <strong>Modelo:</strong>
                  ${escapeHtml(maquina?.modelo ?? "—")}
                </p>

                <p>
                  <strong>N° Serie:</strong>
                  ${escapeHtml(maquina?.numero_serie ?? "—")}
                </p>
              </div>

              <!-- MENSAJE -->

              <div
                style="
                  background:#ecfdf5;
                  border:1px solid #a7f3d0;
                  border-radius:8px;
                  padding:16px;
                  margin-top:24px;
                "
              >
                <p style="margin:0;color:#065f46;">
                  <strong>Estimado cliente:</strong>
                </p>

                <p style="color:#065f46;line-height:1.6;">
                  Le informamos que su máquina ha finalizado su proceso
                  de servicio técnico y se encuentra
                  <strong>lista para entregar</strong>.
                </p>

                <p style="color:#065f46;line-height:1.6;">
                  Puede coordinar el retiro de su equipo con Ferpromaq llamando o escribiendo por WhatsApp al
                  <Br/>
                  +56 9 7626 2689 o dirigiéndose directamente a la sucursal ubicada en Av. Ramón Picarte 2479, Valdivia.
                </p>
              </div>

              <!-- BOTÓN -->

              <div style="text-align:center;margin-top:28px;">
               
              </div>

              <p
                style="
                  margin-top:30px;
                  color:#9ca3af;
                  font-size:11px;
                  text-align:center;
                "
              >
                Este correo fue enviado automáticamente por
                Ferpromaq.
              </p>

            </div>
          </div>
        `,
    });

    if (emailError) {
      console.error("Error enviando correo al cliente:", emailError);

      return NextResponse.json(
        {
          error:
            "La máquina quedó lista para entregar, pero no se pudo enviar el correo al cliente.",
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
    console.error("Error API notificación lista para entrega:", error);

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
