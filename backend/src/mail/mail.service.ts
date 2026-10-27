import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(configService.get<string>('RESEND_API_KEY'));
    this.fromEmail = configService.get<string>('RESEND_FROM_EMAIL') ?? 'noreply@plataforma-vinculacion.cl';
  }

  async sendSolicitudGestionada(params: {
    to: string;
    nombreCliente: string;
    tituloSolicitud: string;
    estado: 'APROBADA' | 'RECHAZADA';
    motivo?: string;
  }): Promise<void> {
    const { to, nombreCliente, tituloSolicitud, estado, motivo } = params;

    const esAprobada = estado === 'APROBADA';
    const subject = esAprobada
      ? 'Tu solicitud ha sido aprobada - VCM FCI-UCM'
      : 'Tu solicitud ha sido revisada - VCM FCI-UCM';

    const mensajeEstado = esAprobada
      ? 'Tu solicitud ha sido <strong style="color:#22C55E;">aprobada</strong>. Un docente de la facultad evaluará tu propuesta y elaborará un planteamiento técnico en los próximos días.'
      : 'Tu solicitud ha sido <strong style="color:#EF4444;">rechazada</strong>. Puedes ingresar a la plataforma para revisar el estado y enviar una nueva solicitud si lo deseas.';

    // El motivo lo escribe el equipo, pero igual se escapa antes de ponerlo en el HTML del correo.
    const escapar = (t: string) =>
      t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const motivoHtml =
      !esAprobada && motivo
        ? `<div style="background-color:#FEF2F2;border-left:4px solid #EF4444;padding:12px 16px;border-radius:4px;margin:16px 0 0;"><p style="margin:0;color:#6B7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Motivo del rechazo</p><p style="margin:4px 0 0;color:#1F2937;font-size:15px;line-height:1.5;">${escapar(motivo)}</p></div>`
        : '';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#F4F6F8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F6F8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#1B3D8C;padding:24px 32px;">
              <p style="margin:0;color:#FFFFFF;font-size:20px;font-weight:700;letter-spacing:0.5px;">VCM FCI · UCM</p>
              <p style="margin:4px 0 0;color:#A5B8E8;font-size:13px;">Vinculación con el Medio — Facultad de Ciencias de la Ingeniería</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#1F2937;font-size:16px;">Hola, <strong>${nombreCliente}</strong>:</p>
              <p style="margin:0 0 16px;color:#1F2937;font-size:15px;line-height:1.6;">
                Nos comunicamos para informarte sobre el estado de tu solicitud:
              </p>
              <div style="background-color:#F4F6F8;border-left:4px solid #1B3D8C;padding:16px 20px;border-radius:4px;margin:0 0 20px;">
                <p style="margin:0;color:#6B7280;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Solicitud</p>
                <p style="margin:4px 0 0;color:#1F2937;font-size:15px;font-weight:600;">${tituloSolicitud}</p>
              </div>
              <p style="margin:0 0 24px;color:#1F2937;font-size:15px;line-height:1.6;">${mensajeEstado}</p>
              ${motivoHtml}
              <p style="margin:0;color:#1F2937;font-size:15px;">Saludos cordiales,<br><strong>Equipo VCM FCI · UCM</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F4F6F8;padding:16px 32px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">Este es un correo automático, por favor no responder.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const { error } = await this.resend.emails.send({ from: this.fromEmail, to, subject, html });
    if (error) {
      console.error('[MailService] Error al enviar correo de solicitud gestionada:', error);
    }
  }

  async sendPlanteamientoGestionado(params: {
    to: string;
    nombreDocente: string;
    tituloSolicitud: string;
    estado: 'APROBADO' | 'RECHAZADO';
    motivo?: string;
  }): Promise<void> {
    const { to, nombreDocente, tituloSolicitud, estado, motivo } = params;

    const esAprobado = estado === 'APROBADO';
    const subject = esAprobado
      ? 'Tu planteamiento ha sido aprobado - VCM FCI-UCM'
      : 'Tu planteamiento ha sido revisado - VCM FCI-UCM';

    const mensajeEstado = esAprobado
      ? 'Tu planteamiento ha sido <strong style="color:#22C55E;">aprobado</strong>. Ya puedes ingresar a la plataforma y crear el proyecto asociado, asignando los alumnos voluntarios correspondientes.'
      : 'Tu planteamiento ha sido <strong style="color:#EF4444;">rechazado</strong>. Puedes ingresar a la plataforma, corregirlo según el motivo indicado y reenviarlo para una nueva evaluación.';

    const escapar = (t: string) =>
      t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const motivoHtml =
      !esAprobado && motivo
        ? `<div style="background-color:#FEF2F2;border-left:4px solid #EF4444;padding:12px 16px;border-radius:4px;margin:0 0 24px;"><p style="margin:0;color:#6B7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Motivo del rechazo</p><p style="margin:4px 0 0;color:#1F2937;font-size:15px;line-height:1.5;">${escapar(motivo)}</p></div>`
        : '';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#F4F6F8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F6F8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#1B3D8C;padding:24px 32px;">
              <p style="margin:0;color:#FFFFFF;font-size:20px;font-weight:700;letter-spacing:0.5px;">VCM FCI · UCM</p>
              <p style="margin:4px 0 0;color:#A5B8E8;font-size:13px;">Vinculación con el Medio — Facultad de Ciencias de la Ingeniería</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#1F2937;font-size:16px;">Hola, <strong>${nombreDocente}</strong>:</p>
              <p style="margin:0 0 16px;color:#1F2937;font-size:15px;line-height:1.6;">
                Te informamos sobre el resultado de la revisión de tu planteamiento:
              </p>
              <div style="background-color:#F4F6F8;border-left:4px solid #1B3D8C;padding:16px 20px;border-radius:4px;margin:0 0 20px;">
                <p style="margin:0;color:#6B7280;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Solicitud asociada</p>
                <p style="margin:4px 0 0;color:#1F2937;font-size:15px;font-weight:600;">${tituloSolicitud}</p>
              </div>
              <p style="margin:0 0 24px;color:#1F2937;font-size:15px;line-height:1.6;">${mensajeEstado}</p>
              ${motivoHtml}
              <p style="margin:0;color:#1F2937;font-size:15px;">Saludos cordiales,<br><strong>Equipo VCM FCI · UCM</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F4F6F8;padding:16px 32px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">Este es un correo automático, por favor no responder.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const { error } = await this.resend.emails.send({ from: this.fromEmail, to, subject, html });
    if (error) {
      console.error('[MailService] Error al enviar correo de planteamiento gestionado:', error);
    }
  }
  /** Avisa al solicitante que su iniciativa pasó a ejecución o que terminó. */
  async sendAvanceIniciativa(params: {
    to: string;
    nombreCliente: string;
    tituloSolicitud: string;
    hito: 'PROYECTO_INICIADO' | 'PROYECTO_FINALIZADO';
    fechaInicio?: string;
    fechaFin?: string;
  }): Promise<void> {
    const { to, nombreCliente, tituloSolicitud, hito, fechaInicio, fechaFin } = params;

    const escapar = (t: string) =>
      t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const iniciado = hito === 'PROYECTO_INICIADO';
    const subject = iniciado
      ? 'Tu iniciativa ya está en ejecución - VCM FCI-UCM'
      : 'Tu iniciativa ha finalizado - VCM FCI-UCM';

    const mensaje = iniciado
      ? 'Tu iniciativa ya está <strong style="color:#22C55E;">en ejecución</strong>. Un equipo de docentes y estudiantes de la facultad comenzó a trabajar en ella.'
      : 'Tu iniciativa ha <strong style="color:#22C55E;">finalizado</strong>. Gracias por confiar en la Facultad de Ciencias de la Ingeniería para este trabajo conjunto.';

    const fechasHtml =
      iniciado && fechaInicio && fechaFin
        ? `<p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.6;">Periodo previsto: <strong>${escapar(fechaInicio)}</strong> al <strong>${escapar(fechaFin)}</strong>.</p>`
        : '';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#F4F6F8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F6F8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#1B3D8C;padding:24px 32px;">
              <p style="margin:0;color:#FFFFFF;font-size:20px;font-weight:700;letter-spacing:0.5px;">VCM FCI · UCM</p>
              <p style="margin:4px 0 0;color:#A5B8E8;font-size:13px;">Vinculación con el Medio — Facultad de Ciencias de la Ingeniería</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#1F2937;font-size:16px;">Hola, <strong>${escapar(nombreCliente)}</strong>:</p>
              <p style="margin:0 0 16px;color:#1F2937;font-size:15px;line-height:1.6;">Te contamos cómo avanza tu iniciativa:</p>
              <div style="background-color:#F4F6F8;border-left:4px solid #1B3D8C;padding:16px 20px;border-radius:4px;margin:0 0 20px;">
                <p style="margin:0;color:#6B7280;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Solicitud</p>
                <p style="margin:4px 0 0;color:#1F2937;font-size:15px;font-weight:600;">${escapar(tituloSolicitud)}</p>
              </div>
              <p style="margin:0 0 16px;color:#1F2937;font-size:15px;line-height:1.6;">${mensaje}</p>
              ${fechasHtml}
              <p style="margin:0;color:#1F2937;font-size:15px;">Saludos cordiales,<br><strong>Equipo VCM FCI · UCM</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F4F6F8;padding:16px 32px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">Este es un correo automático, por favor no responder.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const { error } = await this.resend.emails.send({ from: this.fromEmail, to, subject, html });
    if (error) {
      console.error('[MailService] Error al enviar correo de avance de iniciativa:', error);
    }
  }
}
