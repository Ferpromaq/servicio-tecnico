import { NextRequest, NextResponse } from "next/server";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { createClient } from "@/lib/supabase/server";

const DESTINATARIO = "jp.marin@ferpromaq.cl";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface RepuestoSolicitud {
  id: string;
  nombre: string;
  cantidad: number;
  valor: number;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatoCLP(valor: number): string {
  return `$${valor.toLocaleString("es-CL")}`;
}

export async function POST(request: NextRequest) {
  try {
    // -------------------------------------------------------------
    // LEER BODY
    // -------------------------------------------------------------

    const body = await request.json();

    const {
      ordenId,
      repuestos,
    }: {
      ordenId?: string;
      repuestos?: RepuestoSolicitud[];
    } = body;

    // -------------------------------------------------------------
    // VALIDACIONES
    // -------------------------------------------------------------

    if (!ordenId) {
      return NextResponse.json(
        { error: "Falta el ID de la orden." },
        { status: 400 },
      );
    }

    if (!Array.isArray(repuestos) || repuestos.length === 0) {
      return NextResponse.json(
        { error: "No hay repuestos en la solicitud." },
        { status: 400 },
      );
    }

    // -------------------------------------------------------------
    // NORMALIZAR Y VALIDAR REPUESTOS
    // -------------------------------------------------------------

    const repuestosNormalizados: RepuestoSolicitud[] = [];

    for (const repuesto of repuestos) {
      const idRaw = repuesto?.id;
      const nombre = String(repuesto?.nombre ?? "").trim();
      const cantidad = Number(repuesto?.cantidad);
      const valor = Number(repuesto?.valor);

      if (
        idRaw === undefined ||
        idRaw === null ||
        String(idRaw).trim() === ""
      ) {
        return NextResponse.json(
          {
            error: `Falta el ID del repuesto "${nombre || "(sin nombre)"}".`,
          },
          { status: 400 },
        );
      }

      const id = String(idRaw);

      if (!nombre) {
        return NextResponse.json(
          {
            error: "Todos los repuestos deben tener un nombre.",
          },
          { status: 400 },
        );
      }

      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        return NextResponse.json(
          {
            error: `Cantidad inválida para el repuesto "${nombre}".`,
          },
          { status: 400 },
        );
      }

      if (!Number.isFinite(valor) || valor < 0) {
        return NextResponse.json(
          {
            error: `Valor inválido para el repuesto "${nombre}".`,
          },
          { status: 400 },
        );
      }

      repuestosNormalizados.push({
        id,
        nombre,
        cantidad,
        valor,
      });
    }

    // -------------------------------------------------------------
    // SUPABASE
    // -------------------------------------------------------------

    const supabase = await createClient();

    // -------------------------------------------------------------
    // USUARIO ACTUAL
    // -------------------------------------------------------------

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Error obteniendo usuario:", userError);

      return NextResponse.json(
        {
          error: "No se pudo verificar el usuario autenticado.",
        },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "Usuario no autenticado.",
        },
        { status: 401 },
      );
    }

    // -------------------------------------------------------------
    // OBTENER INFORMACIÓN DE LA ORDEN
    // -------------------------------------------------------------

    const { data: ordenRaw, error: ordenError } = await supabase
      .from("ordenes_servicio")
      .select(
        `
        id,
        numero_orden,
        estado,
        created_at,
        cliente:clientes (
          nombre_razon_social,
          rut,
          telefono,
          correo
        ),
        maquina:maquinas (
          nombre,
          marca,
          modelo,
          numero_serie
        ),
        tecnico:usuarios (
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
        {
          error: "No se encontró la orden.",
          detalle: ordenError?.message ?? null,
        },
        { status: 404 },
      );
    }

    // Supabase puede tipar las relaciones como arrays.
    // Normalizamos para trabajar con un único registro.

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
    // CALCULAR SUBTOTALES Y TOTAL
    // -------------------------------------------------------------

    const repuestosConSubtotal = repuestosNormalizados.map((repuesto) => ({
      ...repuesto,
      subtotal: repuesto.cantidad * repuesto.valor,
    }));

    const totalEstimado = repuestosConSubtotal.reduce(
      (total, repuesto) => total + repuesto.subtotal,
      0,
    );

    // -------------------------------------------------------------
    // GENERAR TABLA HTML
    // -------------------------------------------------------------

    const filasRepuestos = repuestosConSubtotal
      .map(
        (r) => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;">
          <strong>
            ${escapeHtml(r.nombre)}
          </strong>
        </td>

        <td style="padding:12px;text-align:center;border-bottom:1px solid #eee;">
          ${r.cantidad}
        </td>

        <td style="padding:12px;text-align:right;border-bottom:1px solid #eee;">
          ${formatoCLP(r.valor)}
        </td>

        <td style="padding:12px;text-align:right;border-bottom:1px solid #eee;">
          ${formatoCLP(r.subtotal)}
        </td>

        <td style="padding:12px;text-align:center;border-bottom:1px solid #eee;">
          <a
            href="${BASE_URL}/repuestos?repuestosTab=pendiente&amp;repuesto=${encodeURIComponent(r.id)}"
            style="
              display:inline-block;
              background:#16a34a;
              color:#ffffff;
              text-decoration:none;
              padding:8px 14px;
              border-radius:6px;
              font-size:12px;
              font-weight:bold;
            "
          >
            Revisar y aprobar
          </a>
        </td>
      </tr>
    `,
      )
      .join("");

    // -------------------------------------------------------------
    // ENVIAR EMAIL
    // -------------------------------------------------------------

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: DESTINATARIO,
      subject: `Solicitud de repuestos — Orden ${ordenRaw.numero_orden}`,
      html: `
          <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;color:#1f2937;">

            <h2 style="margin-bottom:4px;">
              Solicitud de repuestos
            </h2>

            <p style="color:#6b7280;margin-top:0;">
              Se ha registrado una nueva solicitud de repuestos.
            </p>

            <!-- ORDEN -->

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">

              <h3 style="margin-top:0;">
                Orden de Servicio
              </h3>

              <p>
                <strong>N° Orden:</strong>
                ${escapeHtml(ordenRaw.numero_orden)}
              </p>

              <p>
                <strong>Estado:</strong>
                ${escapeHtml(ordenRaw.estado)}
              </p>

              <p>
                <strong>Fecha de solicitud:</strong>
                ${new Date().toLocaleString("es-CL", {
                  timeZone: "America/Santiago",
                })}
              </p>

            </div>

            <!-- MAQUINA -->

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">

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

            <!-- CLIENTE -->

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">

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

            <!-- TECNICO -->

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">

              <h3 style="margin-top:0;">
                Técnico solicitante
              </h3>

              <p>
                <strong>Nombre:</strong>
                ${escapeHtml(tecnico?.nombre ?? "—")}
              </p>

              <p>
                <strong>Teléfono:</strong>
                ${escapeHtml(tecnico?.telefono ?? "—")}
              </p>

              <p>
                <strong>Usuario:</strong>
                ${escapeHtml(user.email ?? "—")}
              </p>

            </div>

            <!-- REPUESTOS -->

            <h3>
              Repuestos solicitados
            </h3>

            <table
              style="
                width:100%;
                border-collapse:collapse;
                border:1px solid #e5e7eb;
              "
            >
              <thead>
                <tr style="background:#f3f4f6;">

                  <th style="padding:10px;text-align:left;">
                    Repuesto
                  </th>

                  <th style="padding:10px;text-align:center;">
                    Cantidad
                  </th>

                  <th style="padding:10px;text-align:center;">
                    Acción
                  </th>

                  <th style="padding:10px;text-align:right;">
                    Valor unitario
                  </th>

                  <th style="padding:10px;text-align:right;">
                    Subtotal
                  </th>

                </tr>
              </thead>

              <tbody>
                ${filasRepuestos}
              </tbody>
            </table>

            <!-- TOTAL -->

            <div style="text-align:right;margin-top:16px;font-size:18px;">

              <strong>
                Total estimado:
                ${formatoCLP(totalEstimado)}
              </strong>

            </div>

            <!-- ACCION -->

            <div
              style="
                margin-top:30px;
                padding:14px;
                background:#fff7ed;
                border:1px solid #fed7aa;
                border-radius:8px;
              "
            >
              <strong>Acción requerida:</strong>
              revisar y autorizar los repuestos solicitados.
            </div>

          </div>
        `,
    });

    // -------------------------------------------------------------
    // ERROR RESEND
    // -------------------------------------------------------------

    if (emailError) {
      console.error("Error enviando correo:", emailError);

      return NextResponse.json(
        {
          error:
            "La solicitud fue registrada, pero no se pudo enviar el correo.",
          emailError,
        },
        { status: 500 },
      );
    }

    // -------------------------------------------------------------
    // OK
    // -------------------------------------------------------------

    return NextResponse.json({
      success: true,
      emailId: emailData?.id ?? null,
      totalEstimado,
    });
  } catch (error) {
    console.error("Error API solicitud repuestos:", error);

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