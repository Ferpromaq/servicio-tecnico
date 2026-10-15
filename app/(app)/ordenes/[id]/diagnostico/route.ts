import { NextRequest, NextResponse } from "next/server";
import { resend, FROM_EMAIL } from "@/lib/resend";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase-server";

interface OrdenParaDiagnostico {
  id: string;
  numero_orden: string;
  estado: string;
  diagnostico: string | null;
  garantia_ingreso: boolean | null;
  garantia_cubre_dano: boolean | null;
  razon_no_cubre: string | null;
  cliente: { nombre_razon_social: string; correo: string | null } | null;
  maquina: { nombre: string; modelo: string | null } | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ordenId } = await params;

    const body = await req.json().catch(() => null);
    const diagnostico = (body?.diagnostico ?? "").trim();

    if (!diagnostico) {
      return NextResponse.json(
        { error: "El diagnóstico no puede estar vacío." },
        { status: 400 },
      );
    }

    const garantiaCubreDano =
      body?.garantia_cubre_dano === true
        ? true
        : body?.garantia_cubre_dano === false
          ? false
          : null;

    const razonNoCubre =
      typeof body?.razon_no_cubre === "string"
        ? body.razon_no_cubre.trim() || null
        : null;

    // 1) Verificar sesión y rol del usuario
    const supabase = await createServerSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from("usuarios")
      .select("id, nombre, rol, activo")
      .eq("id", user.id)
      .single();

    if (usuarioError || !usuario || !usuario.activo) {
      return NextResponse.json(
        { error: "No se encontró el perfil de usuario o está inactivo." },
        { status: 403 },
      );
    }

    if (usuario.rol !== "tecnico" && usuario.rol !== "admin") {
      return NextResponse.json(
        { error: "Solo un técnico puede registrar el diagnóstico." },
        { status: 403 },
      );
    }

    // 2) service_role para insertar historial (bypass RLS)
    const service = createServiceSupabase();

    const { data: ordenRaw, error: ordenError } = await service
      .from("ordenes_servicio")
      .select(
        `
        id,
        numero_orden,
        estado,
        diagnostico,
        garantia_ingreso,
        garantia_cubre_dano,
        razon_no_cubre,
        cliente:clientes ( nombre_razon_social, correo ),
        maquina:maquinas ( nombre, modelo )
        `,
      )
      .eq("id", ordenId)
      .single();

    if (ordenError || !ordenRaw) {
      return NextResponse.json(
        {
          error: `Orden de servicio no encontrada: ${ordenError?.message ?? ""}`,
        },
        { status: 404 },
      );
    }

    // Cast explícito: Supabase infiere las relaciones como array sin un hint
    // de FK único; en runtime, con .single(), sí llegan como objeto.
    const orden = ordenRaw as unknown as OrdenParaDiagnostico;

    // 3) Determinar número de versión
    const { count } = await service
      .from("diagnosticos_historial")
      .select("id", { count: "exact", head: true })
      .eq("orden_id", ordenId);

    const esPrimerDiagnostico = (count ?? 0) === 0;
    const nuevaVersion = (count ?? 0) + 1;

    // Bloquear si el nuevo texto es idéntico al diagnóstico vigente
    if (orden.diagnostico && orden.diagnostico.trim() === diagnostico) {
      return NextResponse.json(
        {
          error:
            "El diagnóstico no tiene cambios respecto a la versión actual.",
        },
        { status: 409 },
      );
    }

    // 4) Insertar en el historial
    const { error: historialError } = await service
      .from("diagnosticos_historial")
      .insert({
        orden_id: ordenId,
        version: nuevaVersion,
        diagnostico,
        tecnico_id: usuario.id,
        tecnico_nombre: usuario.nombre,
      });

    if (historialError) {
      return NextResponse.json(
        { error: `No se pudo guardar el historial: ${historialError.message}` },
        { status: 500 },
      );
    }

    // 5) Determinar el nuevo estado
    let nuevoEstado = orden.estado;

    if (
      esPrimerDiagnostico &&
      (orden.estado === "recepcion" || orden.estado === "diagnostico")
    ) {
      if (garantiaCubreDano === true) {
        nuevoEstado = "esperando_autorizacion_jefe";
      } else if (garantiaCubreDano === false) {
        nuevoEstado = "esperando_autorizacion_cliente";
      }
    }

    const { error: updateError } = await service
      .from("ordenes_servicio")
      .update({
        diagnostico,
        garantia_cubre_dano: garantiaCubreDano,
        razon_no_cubre: garantiaCubreDano === false ? razonNoCubre : null,
        estado: nuevoEstado,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ordenId);

    if (updateError) {
      return NextResponse.json(
        { error: `No se pudo actualizar la orden: ${updateError.message}` },
        { status: 500 },
      );
    }

    // 6) Historial de estados
    if (nuevoEstado !== orden.estado) {
      const { error: histEstadoError } = await service
        .from("historial_estados")
        .insert({
          origen_tipo: "orden_servicio",
          origen_id: ordenId,
          estado_anterior: orden.estado,
          estado_nuevo: nuevoEstado,
          usuario_id: usuario.id,
        });

      if (histEstadoError) {
        console.error(
          "Error guardando historial_estados:",
          histEstadoError.message,
        );
      }
    }

    // 7) Enviar correos SOLO en el primer diagnóstico
    const emailsEnviados: string[] = [];

    if (esPrimerDiagnostico) {
      const clienteCorreo = orden.cliente?.correo;
      const clienteNombre = orden.cliente?.nombre_razon_social ?? "Cliente";
      const maquinaNombre = orden.maquina?.nombre ?? "su máquina";

      const mensajeCliente =
        garantiaCubreDano === true
          ? `
        <p>
          Le informamos que la máquina <strong>"${maquinaNombre}"</strong>
          (Orden N° ${orden.numero_orden}) ya fue diagnosticada.
        </p>

        <p>
          De acuerdo con el diagnóstico realizado, se determinó que la falla
          se encuentra cubierta por la garantía.
        </p>

        <p>
          Actualmente estamos revisando los repuestos necesarios para realizar
          la reparación. Estos repuestos estarán cubiertos por la garantía,
          por lo que no deberá preocuparse por costos adicionales asociados a
          estas piezas.
        </p>
      `
          : garantiaCubreDano === false
            ? orden.garantia_ingreso === true
              ? `
            <p>
              Le informamos que la máquina <strong>"${maquinaNombre}"</strong>
              (Orden N° ${orden.numero_orden}) ya fue diagnosticada.
            </p>

            <p>
              <strong>Resultado del diagnóstico:</strong><br/>
              ${diagnostico.replace(/\n/g, "<br />")}
            </p>

            <p>
              Si bien la máquina ingresó dentro del período de garantía,
              la falla identificada no se encuentra cubierta por la garantía.
              El motivo es el siguiente:
            </p>

            <p>
              <strong>
                ${razonNoCubre ?? "La falla corresponde a una situación no cubierta por la garantía."}
              </strong>
            </p>

            <p>
              Por este motivo, la reparación deberá realizarse como un servicio
              fuera de garantía.
            </p>

            <p>
              Como siguiente paso, recibirá un nuevo correo con el detalle de
              los repuestos necesarios para realizar la reparación y sus
              respectivos valores.
            </p>

            <p>
              Una vez que reciba ese correo, podrá simplemente responderlo
              indicando si está de acuerdo o no con realizar el pago y continuar
              con la reparación.
            </p>

            <p>
              <strong>Si decide continuar:</strong><br/>
              será necesario realizar un pago de al menos el
              <strong>60% del valor de los repuestos</strong> para que podamos
              continuar con el proceso de reparación.
            </p>

            <p>
              <strong>Si decide no continuar:</strong><br/>
              no se realizará la reparación. Procederemos a alistar la máquina
              y la dejaremos disponible para que pueda retirarla en nuestras
              instalaciones.
            </p>
          `
              : `
            <p>
              Le informamos que la máquina <strong>"${maquinaNombre}"</strong>
              (Orden N° ${orden.numero_orden}) ya fue diagnosticada.
            </p>

            <p>
              <strong>Resultado del diagnóstico:</strong><br/>
              ${diagnostico.replace(/\n/g, "<br />")}
            </p>

            <p>
              De acuerdo con el diagnóstico realizado, la falla no se encuentra
              cubierta por la garantía.
            </p>

            <p>
              Por este motivo, la reparación deberá realizarse como un servicio
              fuera de garantía.
            </p>

            <p>
              Como siguiente paso, recibirá un nuevo correo con el detalle de
              los repuestos necesarios para realizar la reparación y sus
              respectivos valores.
            </p>

            <p>
              Una vez que reciba ese correo, podrá simplemente responderlo
              indicando si está de acuerdo o no con realizar el pago y continuar
              con la reparación.
            </p>

            <p>
              <strong>Si decide continuar:</strong><br/>
              será necesario realizar un pago de al menos el
              <strong>60% del valor de los repuestos</strong> para que podamos
              continuar con el proceso de reparación.
            </p>

            <p>
              <strong>Si decide no continuar:</strong><br/>
              no se realizará la reparación. Procederemos a alistar la máquina
              y la dejaremos disponible para que pueda retirarla en nuestras
              instalaciones.
            </p>
          `
            : `
          <p>
            Le informamos que la máquina <strong>"${maquinaNombre}"</strong>
            (Orden N° ${orden.numero_orden}) ya fue diagnosticada.
          </p>

          <p>
            <strong>Resultado del diagnóstico:</strong><br/>
            ${diagnostico.replace(/\n/g, "<br />")}
          </p>

          <p>
            El diagnóstico ha sido registrado correctamente y próximamente
            le informaremos los siguientes pasos para continuar con el servicio.
          </p>
        `;

      // Correo al cliente
      if (clienteCorreo) {
        try {
          console.log("RESEND: intentando enviar correo", {
            from: FROM_EMAIL,
            to: clienteCorreo,
            ordenId,
            numeroOrden: orden.numero_orden,
          });

          const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: clienteCorreo,
            subject: `Diagnóstico completado — Orden N° ${orden.numero_orden}`,
            html: `
              <p>Estimado/a ${clienteNombre},</p>

              ${mensajeCliente}

              <p>
                Saludos,<br/>
                Equipo de Servicio Técnico - Ferpromaq
              </p>
            `,
          });

          if (error) {
            console.error("RESEND ERROR:", error);

            return NextResponse.json(
              {
                error:
                  "El diagnóstico se guardó, pero Resend rechazó el correo.",
                resendError: error.message,
              },
              { status: 502 },
            );
          }

          console.log("RESEND OK:", data);

          emailsEnviados.push(clienteCorreo);
        } catch (e) {
          console.error("RESEND EXCEPTION:", e);

          return NextResponse.json(
            {
              error:
                "El diagnóstico se guardó, pero ocurrió un error enviando el correo.",
              resendError:
                e instanceof Error ? e.message : "Error desconocido de Resend",
            },
            { status: 502 },
          );
        }
      }

      // Correos a supervisores
      const { data: supervisores } = await service
        .from("usuarios")
        .select("id, nombre")
        .eq("rol", "supervisor")
        .eq("activo", true);

      const correosSupervisores: string[] = [];

      for (const sup of supervisores ?? []) {
        try {
          const { data: authUser } = await service.auth.admin.getUserById(
            sup.id,
          );

          if (authUser?.user?.email) {
            correosSupervisores.push(authUser.user.email);
          }
        } catch (e) {
          console.error(`Error obteniendo correo de supervisor ${sup.id}:`, e);
        }
      }

      if (correosSupervisores.length > 0) {
        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: correosSupervisores,
            subject: `[Interno] Diagnóstico registrado — Orden N° ${orden.numero_orden}`,
            html: `
              <p>
                El técnico <strong>${usuario.nombre}</strong> registró el diagnóstico
                de la orden N° ${orden.numero_orden}.
              </p>

              <p>
                <strong>Cliente:</strong> ${clienteNombre}
              </p>

              <p>
                <strong>Máquina:</strong> ${maquinaNombre}
              </p>

              <p>
                <strong>Garantía:</strong>
                ${
                  garantiaCubreDano === true
                    ? orden.garantia_ingreso === true
                      ? "Ingresó con garantía — daño cubierto"
                      : "Ingresó sin garantía — daño marcado como cubierto"
                    : garantiaCubreDano === false
                      ? orden.garantia_ingreso === true
                        ? "Ingresó con garantía — daño NO cubierto"
                        : "Ingresó sin garantía — daño NO cubierto"
                      : "No determinada"
                }
              </p>

              ${
                garantiaCubreDano === false && razonNoCubre
                  ? `
                    <p>
                      <strong>Razón no cubre:</strong><br/>
                      ${razonNoCubre.replace(/\n/g, "<br/>")}
                    </p>
                  `
                  : ""
              }

              <p>
                <strong>Diagnóstico:</strong><br/>
                ${diagnostico.replace(/\n/g, "<br/>")}
              </p>
            `,
          });

          emailsEnviados.push(...correosSupervisores);
        } catch (e) {
          console.error("Error enviando correo a supervisores:", e);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      orden: {
        id: ordenId,
        estado: nuevoEstado,
        diagnostico,
        garantia_cubre_dano: garantiaCubreDano,
        razon_no_cubre: garantiaCubreDano === false ? razonNoCubre : null,
      },
      version: nuevaVersion,
      correosEnviados: emailsEnviados,
    });
  } catch (err) {
    console.error("Error inesperado en POST /diagnostico:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error inesperado al guardar el diagnóstico.",
      },
      { status: 500 },
    );
  }
}
