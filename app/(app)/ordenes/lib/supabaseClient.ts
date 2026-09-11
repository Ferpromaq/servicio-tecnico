// Instancia única del cliente de Supabase para browser, compartida por
// TODO el módulo de órdenes (lista, drawer y este modal). Colócalo en
// app/(app)/ordenes/lib/supabaseClient.ts e importa desde ahí en vez de
// llamar a createClient() por separado en cada archivo.
import { createClient } from "@/lib/supabase-browser";

export const supabase = createClient();
