import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";


dotenv.config({
  path: ".env.local"
});


const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;


const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;



if (!supabaseUrl) {
  throw new Error(
    "Falta NEXT_PUBLIC_SUPABASE_URL en .env.local"
  );
}


if (!supabaseKey) {
  throw new Error(
    "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local"
  );
}


export const supabase =
  createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth:{
        autoRefreshToken:false,
        persistSession:false
      }
    }
  );