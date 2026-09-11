// lib/resend.ts
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

// ⚠️ Debe ser un dominio verificado en Resend (no puedes usar cualquier correo)
export const FROM_EMAIL = "Ordenes de Servicio <notificaciones@ordenes.ferpromaq.cl>";