// Plantilla del correo que recibe el CLIENTE cuando se solicitan repuestos.
// HTML con estilos en línea y tablas (compatible con Gmail/Outlook).

export const DATOS_TRANSFERENCIA = {
  rut: "78.095.597-K",
  razonSocial: "Comercial e Inversiones Picarte SPA",
  banco: "Banco Santander",
  tipoCuenta: "Cuenta Corriente",
  numeroCuenta: "96801017",
  correo: "caja.ferpromaq@gmail.com",
};

export const PORCENTAJE_ABONO = 0.6;

export interface RepuestoCorreo {
  nombre: string;
  cantidad: number;
  valor: number; // valor unitario
}

function clp(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function construirCorreoSolicitudCliente(params: {
  nombreCliente: string;
  nombreMaquina: string;
  numeroOrden: string;
  repuestos: RepuestoCorreo[];
}) {
  const { nombreCliente, nombreMaquina, numeroOrden, repuestos } = params;

  const total = repuestos.reduce((t, r) => t + r.cantidad * r.valor, 0);
  const abono = Math.round(total * PORCENTAJE_ABONO);
  const d = DATOS_TRANSFERENCIA;

  const filas = repuestos
    .map(
      (r) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#111827;">${esc(r.nombre)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#374151;text-align:center;">${r.cantidad}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#374151;text-align:right;">${clp(r.valor)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#111827;text-align:right;font-weight:600;">${clp(r.cantidad * r.valor)}</td>
        </tr>`,
    )
    .join("");

  const filaDato = (label: string, valor: string) => `
        <tr>
          <td style="padding:4px 0;color:#6b7280;width:140px;">${label}</td>
          <td style="padding:4px 0;color:#111827;font-weight:600;">${esc(valor)}</td>
        </tr>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

        <tr><td style="background:#ea580c;padding:20px 24px;">
          <div style="color:#ffffff;font-size:18px;font-weight:700;">Repuestos necesarios para su reparación</div>
          <div style="color:#ffedd5;font-size:13px;margin-top:4px;">Orden de servicio ${esc(numeroOrden)}</div>
        </td></tr>

        <tr><td style="padding:24px;color:#374151;font-size:14px;line-height:1.6;">
          <p style="margin:0 0 12px;">Estimado/a <strong>${esc(nombreCliente)}</strong>:</p>
          <p style="margin:0 0 16px;">
            Los siguientes son los repuestos necesarios para reparar su máquina
            <strong>${esc(nombreMaquina)}</strong>:
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;font-size:13px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;border-bottom:1px solid #e5e7eb;">Repuesto</th>
                <th style="padding:10px 12px;text-align:center;color:#6b7280;font-size:11px;text-transform:uppercase;border-bottom:1px solid #e5e7eb;">Cantidad</th>
                <th style="padding:10px 12px;text-align:right;color:#6b7280;font-size:11px;text-transform:uppercase;border-bottom:1px solid #e5e7eb;">Valor</th>
                <th style="padding:10px 12px;text-align:right;color:#6b7280;font-size:11px;text-transform:uppercase;border-bottom:1px solid #e5e7eb;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${filas}
              <tr style="background:#fff7ed;">
                <td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:#9a3412;">TOTAL</td>
                <td style="padding:12px;text-align:right;font-weight:700;color:#9a3412;font-size:15px;">${clp(total)}</td>
              </tr>
            </tbody>
          </table>

          <p style="margin:20px 0 8px;font-size:15px;"><strong>¿Está de acuerdo con avanzar con la reparación?</strong></p>
          <p style="margin:0 0 16px;">
            De ser así, debe acercarse a nuestra <strong>sucursal de Picarte</strong> a pagar al menos el
            <strong>60% del valor total</strong> (<strong>${clp(abono)}</strong>), o bien puede realizar una
            <strong>transferencia</strong> con los siguientes datos:
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
            <tr><td style="padding:14px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                ${filaDato("RUT", d.rut)}
                ${filaDato("Razón Social", d.razonSocial)}
                ${filaDato("Banco", d.banco)}
                ${filaDato(d.tipoCuenta, d.numeroCuenta)}
                ${filaDato("Correo", d.correo)}
              </table>
            </td></tr>
          </table>

          <p style="margin:16px 0 0;color:#6b7280;font-size:12px;">
            Una vez realizada la transferencia, puede enviar el comprobante a ${esc(d.correo)}.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const texto = [
    `Estimado/a ${nombreCliente}:`,
    ``,
    `Los siguientes son los repuestos necesarios para reparar su máquina ${nombreMaquina} (orden ${numeroOrden}):`,
    ``,
    ...repuestos.map(
      (r) =>
        `- ${r.nombre} | Cant: ${r.cantidad} | Valor: ${clp(r.valor)} | Subtotal: ${clp(r.cantidad * r.valor)}`,
    ),
    ``,
    `TOTAL: ${clp(total)}`,
    ``,
    `¿Está de acuerdo con avanzar? De ser así, acérquese a la sucursal de Picarte a pagar al menos el 60% (${clp(abono)}) o transfiera a:`,
    `RUT: ${d.rut}`,
    `Razón Social: ${d.razonSocial}`,
    `Banco: ${d.banco}`,
    `${d.tipoCuenta}: ${d.numeroCuenta}`,
    `Correo: ${d.correo}`,
  ].join("\n");

  return {
    subject: `Repuestos necesarios para su máquina – Orden ${numeroOrden}`,
    html,
    text: texto,
  };
}
