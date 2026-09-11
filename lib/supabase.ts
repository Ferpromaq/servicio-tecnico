import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltan las variables de entorno de Supabase");
}

// createBrowserClient (de @supabase/ssr) guarda la sesión en cookies
// además de localStorage, para que el middleware (que corre en el
// servidor y solo puede leer cookies) también pueda verla.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);