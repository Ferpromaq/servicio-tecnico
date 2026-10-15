import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface Body {
  ordenId: string;
  email: string;
  password: string;
  motivo: string;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Leer y validar el cuerpo de la petición
    let body: Body;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la petición no es válido." },
        { status: 400 },
      );
    }

    const { ordenId, email, password, motivo } = body;

    if (!ordenId || !email?.trim() || !password || !motivo?.trim()) {
      return NextResponse.json(
        {
          error:
            "Debes indicar la orden, el correo, la contraseña y el motivo.",
        },
        { status: 400 },
      );
    }

    if (motivo.trim().length > 500) {
      return NextResponse.json(
        { error: "El motivo no puede superar los 500 caracteres." },
        { status: 400 },
      );
    }

    // 2. Validar las credenciales con Supabase Auth
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authError } =
      await authClient.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Las credenciales son incorrectas." },
        { status: 401 },
      );
    }

    // 3. Cliente administrativo, exclusivamente en el servidor
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 4. Verificar que la cuenta tenga rol de administrador
    const { data: usuario, error: usuarioError } = await adminClient
      .from("usuarios")
      .select("id, nombre, rol")
      .eq("id", authData.user.id)
      .single();

    if (usuarioError || !usuario) {
      return NextResponse.json(
        {
          error: "No se encontró un usuario asociado a esta cuenta.",
        },
        { status: 403 },
      );
    }

    if (usuario.rol !== "admin") {
      return NextResponse.json(
        {
          error: "Esta cuenta no tiene permisos de administrador.",
        },
        { status: 403 },
      );
    }

    // 5. Verificar que la orden exista y esté lista para entrega
    const { data: orden, error: ordenError } = await adminClient
      .from("ordenes_servicio")
      .select("id, estado")
      .eq("id", ordenId)
      .maybeSingle();

    if (ordenError) {
      console.error("Error consultando la orden:", ordenError);

      return NextResponse.json(
        { error: "No se pudo consultar la orden." },
        { status: 500 },
      );
    }

    if (!orden) {
      return NextResponse.json(
        { error: "La orden no existe." },
        { status: 404 },
      );
    }

    if (orden.estado !== "lista_para_entrega") {
      return NextResponse.json(
        {
          error:
            "La autorización excepcional solo aplica a órdenes listas para entrega.",
        },
        { status: 409 },
      );
    }

    // 6. Registrar la autorización administrativa
    const ahora = new Date().toISOString();

    const { error: updateError } = await adminClient
      .from("ordenes_servicio")
      .update({
        repuestos_excepcion_autorizada_por: usuario.id,
        repuestos_excepcion_autorizada_en: ahora,
        repuestos_excepcion_motivo: motivo.trim(),
      })
      .eq("id", ordenId)
      .eq("estado", "lista_para_entrega");

    if (updateError) {
      console.error("Error guardando la autorización excepcional:", {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
      });

      return NextResponse.json(
        {
          error: "No se pudo registrar la autorización administrativa.",
          code: updateError.code,
        },
        { status: 500 },
      );
    }

    // 7. Responder al frontend
    return NextResponse.json(
      {
        success: true,
        message: "Autorización administrativa registrada.",
        autorizadoPor: usuario.nombre,
        autorizadoEn: ahora,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error en autorización excepcional de repuestos:", error);

    return NextResponse.json(
      { error: "Ocurrió un error interno al autorizar la solicitud." },
      { status: 500 },
    );
  }
}
