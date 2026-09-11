/**
 * POST /repuestos/lib
 * ---------------------------------------------------------------
 * Valida las credenciales de una cuenta admin y autoriza o rechaza
 * un repuesto solicitado.
 *
 * Si autoriza:
 *   estado         = autorizado
 *   autorizado_por = admin
 *   autorizado_en  = fecha
 *
 * Si rechaza:
 *   estado        = rechazado
 *   rechazado_por = admin
 *   rechazado_en  = fecha
 *
 * También registra:
 *
 *   cliente_contactado
 *   cliente_contactado_por
 *
 * La cuenta utilizada para autorizar/rechazar no tiene que ser
 * la misma cuenta actualmente logueada en la aplicación.
 *
 * IMPORTANTE:
 * Este endpoint utiliza SERVICE ROLE únicamente en el servidor.
 * ---------------------------------------------------------------
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ================================================================
// VARIABLES DE ENTORNO
// ================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ================================================================
// TIPOS
// ================================================================

type Accion = "autorizado" | "rechazado";

interface Body {
  repuestoId: string;
  accion: Accion;
  email: string;
  password: string;
  motivo: string;

  clienteContactado?: boolean;
  clienteContactadoPor?: string | null;
}

// ================================================================
// POST
// ================================================================

export async function POST(req: NextRequest) {
  // ==============================================================
  // 0. LEER BODY
  // ==============================================================

  let body: Body;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: "Body inválido.",
      },
      {
        status: 400,
      },
    );
  }

  const {
    repuestoId,
    accion,
    email,
    password,
    motivo,
    clienteContactado,
    clienteContactadoPor,
  } = body;

  // ==============================================================
  // 0.1 VALIDAR CAMPOS PRINCIPALES
  // ==============================================================

  if (!repuestoId || !accion || !email || !password) {
    return NextResponse.json(
      {
        error: "Faltan campos requeridos.",
      },
      {
        status: 400,
      },
    );
  }

  // ==============================================================
  // 0.2 VALIDAR ACCIÓN
  // ==============================================================

  if (
    accion !== "autorizado" &&
    accion !== "rechazado"
  ) {
    return NextResponse.json(
      {
        error: "Acción inválida.",
      },
      {
        status: 400,
      },
    );
  }

  // ==============================================================
  // 0.3 NORMALIZAR MOTIVO
  // ==============================================================

  const motivoNormalizado = motivo?.trim() ?? "";

  if (!motivoNormalizado) {
    return NextResponse.json(
      {
        error: `Debes indicar un motivo para ${
          accion === "autorizado"
            ? "autorizar"
            : "rechazar"
        } el repuesto.`,
      },
      {
        status: 400,
      },
    );
  }

  if (motivoNormalizado.length > 500) {
    return NextResponse.json(
      {
        error:
          "El motivo no puede superar los 500 caracteres.",
      },
      {
        status: 400,
      },
    );
  }

  // ==============================================================
  // 0.4 VALIDAR CONTACTO DEL CLIENTE
  // ==============================================================

  const contactoCliente =
    clienteContactado === true;

  const nombreContactoNormalizado =
    typeof clienteContactadoPor === "string"
      ? clienteContactadoPor.trim()
      : "";

  if (
    contactoCliente &&
    !nombreContactoNormalizado
  ) {
    return NextResponse.json(
      {
        error:
          "Debes indicar quién contactó al cliente.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    nombreContactoNormalizado.length > 150
  ) {
    return NextResponse.json(
      {
        error:
          "El nombre de quien contactó al cliente no puede superar los 150 caracteres.",
      },
      {
        status: 400,
      },
    );
  }

  // ==============================================================
  // 1. CLIENTE SUPABASE PARA VALIDAR CREDENCIALES
  //
  // Este cliente NO persiste sesión.
  // ==============================================================

  const authClient = createSupabaseClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const {
    data: signInData,
    error: signInError,
  } =
    await authClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

  // ==============================================================
  // 1.1 CREDENCIALES INCORRECTAS
  // ==============================================================

  if (
    signInError ||
    !signInData.user
  ) {
    console.error(
      "Error de autenticación del admin:",
      signInError,
    );

    return NextResponse.json(
      {
        error: "Credenciales inválidas.",
      },
      {
        status: 401,
      },
    );
  }

  const adminAuthId =
    signInData.user.id;

  // ==============================================================
  // 2. CLIENTE SERVICE ROLE
  //
  // Se utiliza exclusivamente en el servidor.
  // ==============================================================

  const adminClient =
    createSupabaseClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

  // ==============================================================
  // 2.1 BUSCAR USUARIO
  // ==============================================================

  const {
    data: usuario,
    error: usuarioError,
  } = await adminClient
    .from("usuarios")
    .select("id, nombre, rol")
    .eq("id", adminAuthId)
    .single();

  if (
    usuarioError ||
    !usuario
  ) {
    console.error(
      "No se encontró el usuario admin:",
      usuarioError,
    );

    return NextResponse.json(
      {
        error:
          "No se encontró un usuario asociado a esa cuenta.",
      },
      {
        status: 403,
      },
    );
  }

  // ==============================================================
  // 2.2 COMPROBAR ROL
  // ==============================================================

  if (usuario.rol !== "admin") {
    return NextResponse.json(
      {
        error:
          "Esta cuenta no tiene rol de administrador.",
      },
      {
        status: 403,
      },
    );
  }

  // ==============================================================
  // 3. BUSCAR REPUESTO
  // ==============================================================

  const {
    data: repuestoActual,
    error: repuestoError,
  } = await adminClient
    .from("repuestos_solicitados")
    .select(
      `
        id,
        nombre_repuesto,
        estado,
        autorizado_por,
        autorizado_en,
        rechazado_por,
        rechazado_en,
        motivo_autorizacion,
        motivo_rechazo,
        cliente_contactado,
        cliente_contactado_por
      `,
    )
    .eq("id", repuestoId)
    .single();

  // ==============================================================
  // 3.1 REPUESTO NO ENCONTRADO
  // ==============================================================

  if (
    repuestoError ||
    !repuestoActual
  ) {
    console.error(
      "Error buscando repuesto:",
      repuestoError,
    );

    return NextResponse.json(
      {
        error:
          "No se encontró el repuesto solicitado.",
      },
      {
        status: 404,
      },
    );
  }

  // ==============================================================
  // 3.2 SOLO SE PUEDEN MODIFICAR PENDIENTES
  // ==============================================================

  if (
    repuestoActual.estado !==
    "pendiente"
  ) {
    return NextResponse.json(
      {
        error:
          `Este repuesto ya no está pendiente. ` +
          `Estado actual: ${repuestoActual.estado}.`,
      },
      {
        status: 409,
      },
    );
  }

  // ==============================================================
  // 4. PREPARAR ACTUALIZACIÓN
  // ==============================================================

  const ahora =
    new Date().toISOString();

  const updateData: Record<
    string,
    string | boolean | null
  > = {
    // ------------------------------------------------------------
    // CONTACTO DEL CLIENTE
    // ------------------------------------------------------------

    cliente_contactado:
      contactoCliente,

    cliente_contactado_por:
      contactoCliente
        ? nombreContactoNormalizado
        : null,
  };

  // ==============================================================
  // 4.1 AUTORIZAR
  // ==============================================================

  if (accion === "autorizado") {
    Object.assign(updateData, {
      estado: "autorizado",

      autorizado_por: usuario.id,
      autorizado_en: ahora,

      motivo_autorizacion:
        motivoNormalizado,

      // Garantizar que no exista auditoría de rechazo
      rechazado_por: null,
      rechazado_en: null,
      motivo_rechazo: null,
    });
  }

  // ==============================================================
  // 4.2 RECHAZAR
  // ==============================================================

  else {
    Object.assign(updateData, {
      estado: "rechazado",

      rechazado_por: usuario.id,
      rechazado_en: ahora,

      motivo_rechazo:
        motivoNormalizado,

      // Garantizar que no exista auditoría de autorización
      autorizado_por: null,
      autorizado_en: null,
      motivo_autorizacion: null,
    });
  }

  // ==============================================================
  // 5. ACTUALIZAR
  //
  // La condición estado = pendiente evita que dos solicitudes
  // puedan procesar simultáneamente el mismo repuesto.
  // ==============================================================

  const {
    data: repuesto,
    error: updateError,
  } = await adminClient
    .from("repuestos_solicitados")
    .update(updateData)
    .eq("id", repuestoId)
    .eq("estado", "pendiente")
    .select(
      `
        id,
        nombre_repuesto,
        estado,
        autorizado_por,
        autorizado_en,
        rechazado_por,
        rechazado_en,
        motivo_autorizacion,
        motivo_rechazo,
        cliente_contactado,
        cliente_contactado_por
      `,
    )
    .maybeSingle();

  // ==============================================================
  // 5.1 ERROR DE SUPABASE
  // ==============================================================

  if (updateError) {
    console.error(
      "Error actualizando repuesto:",
      updateError,
    );

    return NextResponse.json(
      {
        error:
          "No se pudo actualizar el repuesto.",
        details:
          updateError.message,
      },
      {
        status: 500,
      },
    );
  }

  // ==============================================================
  // 5.2 NO SE ACTUALIZÓ NINGUNA FILA
  // ==============================================================

  if (!repuesto) {
    return NextResponse.json(
      {
        error:
          "El repuesto ya no está pendiente o fue procesado por otra solicitud.",
      },
      {
        status: 409,
      },
    );
  }

  // ==============================================================
  // 6. LOG
  // ==============================================================

  console.log(
    "✅ Repuesto procesado:",
    {
      repuestoId,
      accion,
      estado: repuesto.estado,

      usuarioId: usuario.id,
      nombreAdministrador:
        usuario.nombre,

      clienteContactado:
        repuesto.cliente_contactado,

      clienteContactadoPor:
        repuesto.cliente_contactado_por,
    },
  );

  // ==============================================================
  // 7. RESPUESTA
  // ==============================================================

  return NextResponse.json(
    {
      success: true,
      repuesto,
    },
    {
      status: 200,
    },
  );
}