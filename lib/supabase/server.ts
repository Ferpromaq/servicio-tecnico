import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltan las variables de entorno de Supabase");
}

// createServerClient (de @supabase/ssr) lee la sesión desde las cookies
// de la petición actual. Esto es lo que permite que, dentro de un
// Server Component, `auth.uid()` funcione correctamente en las
// políticas RLS de Supabase (ej: "staff_acceso_total").
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // `setAll` fue llamado desde un Server Component (no una
          // Server Action ni un Route Handler), donde no se pueden
          // escribir cookies directamente. Se puede ignorar siempre
          // que tengas un middleware.ts refrescando la sesión (ver
          // pregunta abajo).
        }
      },
    },
  });
}