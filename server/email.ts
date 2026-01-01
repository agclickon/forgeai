// Email service using Resend integration
import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export interface SendInviteEmailParams {
  toEmail: string;
  inviteeName: string;
  projectName: string;
  inviterName: string;
  inviteToken: string;
  role: string;
}

export async function sendInviteEmail(params: SendInviteEmailParams): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    let baseUrl = 'http://localhost:5000';
    if (process.env.REPLIT_DEPLOYMENT_URL) {
      baseUrl = process.env.REPLIT_DEPLOYMENT_URL;
    } else if (process.env.REPLIT_DEV_DOMAIN) {
      baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    }
    
    console.log(`[Email] Using base URL for invite: ${baseUrl}`);
    
    const inviteUrl = `${baseUrl}/convite/${params.inviteToken}`;
    
    const roleLabel = params.role === 'owner' ? 'Proprietário' 
      : params.role === 'manager' ? 'Gerente' 
      : 'Colaborador';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 { color: #1a1a2e; margin: 0; font-size: 28px; }
    .content { background: #f8f9fa; border-radius: 12px; padding: 32px; margin-bottom: 32px; }
    .project-name { font-size: 20px; font-weight: 600; color: #1a1a2e; margin-bottom: 16px; }
    .role-badge { display: inline-block; background: #e8f4ff; color: #0066cc; padding: 4px 12px; border-radius: 16px; font-size: 14px; margin-bottom: 16px; }
    .button { display: inline-block; background: #0066cc; color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
    .footer { text-align: center; color: #666; font-size: 14px; }
    .link-text { word-break: break-all; color: #666; font-size: 12px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Convite para Projeto</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${params.inviteeName}</strong>,</p>
      <p><strong>${params.inviterName}</strong> convidou você para participar do projeto:</p>
      <div class="project-name">${params.projectName}</div>
      <div class="role-badge">${roleLabel}</div>
      <p>Clique no botão abaixo para aceitar o convite e criar sua conta:</p>
      <center>
        <a href="${inviteUrl}" class="button">Aceitar Convite</a>
      </center>
      <p class="link-text">Ou copie e cole este link no seu navegador:<br>${inviteUrl}</p>
    </div>
    <div class="footer">
      <p>Este convite expira em 7 dias.</p>
      <p>Se você não esperava este e-mail, pode ignorá-lo com segurança.</p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Olá ${params.inviteeName},

${params.inviterName} convidou você para participar do projeto "${params.projectName}" como ${roleLabel}.

Clique no link abaixo para aceitar o convite e criar sua conta:
${inviteUrl}

Este convite expira em 7 dias.

Se você não esperava este e-mail, pode ignorá-lo com segurança.
    `;

    await client.emails.send({
      from: fromEmail || 'noreply@resend.dev',
      to: params.toEmail,
      subject: `Convite para o projeto: ${params.projectName}`,
      html: htmlContent,
      text: textContent,
    });

    console.log(`Invite email sent successfully to ${params.toEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send invite email:', error);
    return false;
  }
}
