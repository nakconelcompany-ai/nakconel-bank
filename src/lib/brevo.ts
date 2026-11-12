/**
 * Brevo (Sendinblue) transactional email helper.
 * Docs: https://developers.brevo.com/reference/sendtransacemail
 *
 * Required env var: BREVO_API_KEY
 * Optional env vars:
 *   BREVO_FROM_EMAIL  (default: noreply@nakconelbank.com)
 *   BREVO_FROM_NAME   (default: Nakconel Bank)
 */

export class BrevoError extends Error {}

function getApiKey(): string {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new BrevoError('BREVO_API_KEY is not configured.');
  return key;
}

export async function sendOtpEmail(input: {
  to: string;
  toName: string;
  code: string;
  purpose: 'signup' | 'password-reset';
}) {
  const apiKey = getApiKey();
  const fromEmail = process.env.BREVO_FROM_EMAIL ?? 'noreply@nakconelbank.com';
  const fromName  = process.env.BREVO_FROM_NAME  ?? 'Nakconel Bank';

  const subject = input.purpose === 'signup'
    ? 'Your Nakconel Bank verification code'
    : 'Reset your Nakconel Bank password';

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5efe4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5efe4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#fffdf8;border-radius:20px;border:1px solid #e9dfd0;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(110deg,#3e0c11,#651719 66%,#4a1015);padding:24px 32px;text-align:center;">
              <p style="margin:0;font-family:Georgia,serif;font-size:22px;letter-spacing:.14em;color:#f2d995;font-weight:700;">NAKCONEL</p>
              <p style="margin:4px 0 0;font-family:Georgia,serif;font-size:10px;letter-spacing:.36em;color:#fff4d8;">BANK</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 28px;text-align:center;">
              <p style="margin:0 0 8px;color:#651719;font-size:22px;font-weight:700;">
                ${input.purpose === 'signup' ? 'Verify your email' : 'Reset your password'}
              </p>
              <p style="margin:0 0 28px;color:#82736b;font-size:14px;line-height:1.6;">
                ${input.purpose === 'signup'
                  ? 'Enter this code to complete your Nakconel Bank registration.'
                  : 'Enter this code to reset your password. It expires in 10 minutes.'}
              </p>
              <!-- OTP code box -->
              <div style="background:#f8f2e8;border:2px solid #c59b44;border-radius:14px;padding:20px 32px;display:inline-block;margin-bottom:28px;">
                <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:.22em;color:#3e0c11;font-family:Georgia,serif;">${input.code}</p>
              </div>
              <p style="margin:0 0 8px;color:#82736b;font-size:13px;">This code expires in <strong>10 minutes</strong>.</p>
              <p style="margin:0;color:#82736b;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;text-align:center;border-top:1px solid #e9dfd0;">
              <p style="margin:0;color:#a19489;font-size:11px;line-height:1.6;">
                Nakconel Bank &nbsp;·&nbsp; Secure. Simple. Global.<br/>
                Do not share this code with anyone, including Nakconel staff.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textContent = `Your Nakconel Bank ${input.purpose === 'signup' ? 'verification' : 'password reset'} code is: ${input.code}\n\nThis code expires in 10 minutes.\nDo not share this code with anyone.`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept':       'application/json',
      'content-type': 'application/json',
      'api-key':      apiKey,
    },
    body: JSON.stringify({
      sender:      { name: fromName, email: fromEmail },
      to:          [{ email: input.to, name: input.toName }],
      subject,
      htmlContent,
      textContent,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    console.error(JSON.stringify({ level: 'error', provider: 'brevo', status: res.status, message: body.message }));
    throw new BrevoError(`Could not send verification email (${res.status}). Please try again.`);
  }
}

/* ── Shared HTML email shell ── */
function emailShell(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f5efe4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5efe4;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fffdf8;border-radius:20px;border:1px solid #e9dfd0;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(110deg,#3e0c11,#651719 66%,#4a1015);padding:22px 32px;text-align:center;">
            <p style="margin:0;font-family:Georgia,serif;font-size:20px;letter-spacing:.14em;color:#f2d995;font-weight:700;">NAKCONEL</p>
            <p style="margin:3px 0 0;font-family:Georgia,serif;font-size:9px;letter-spacing:.36em;color:#fff4d8;">BANK</p>
          </td>
        </tr>
        <tr><td style="padding:32px 32px 24px;">${bodyHtml}</td></tr>
        <tr>
          <td style="padding:14px 32px 22px;text-align:center;border-top:1px solid #e9dfd0;">
            <p style="margin:0;color:#a19489;font-size:11px;line-height:1.6;">Nakconel Bank &nbsp;·&nbsp; Secure. Simple. Global.<br/>If you did not perform this action, contact support immediately.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendEmail(input: { to: string; toName: string; subject: string; html: string; text: string }) {
  const apiKey   = process.env.BREVO_API_KEY;
  if (!apiKey) { console.warn('BREVO_API_KEY not set — skipping email alert'); return; }
  const fromEmail = process.env.BREVO_FROM_EMAIL ?? 'noreply@nakconelbank.com';
  const fromName  = process.env.BREVO_FROM_NAME  ?? 'Nakconel Bank';
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({ sender: { name: fromName, email: fromEmail }, to: [{ email: input.to, name: input.toName }], subject: input.subject, htmlContent: input.html, textContent: input.text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    console.error(JSON.stringify({ level: 'error', provider: 'brevo', alert: input.subject, status: res.status, message: body.message }));
  }
}

/** Alert: new login detected */
export async function sendLoginAlertEmail(input: { to: string; toName: string; time: string; ip?: string }) {
  const html = emailShell(`
    <p style="margin:0 0 6px;color:#651719;font-size:20px;font-weight:700;">New login detected</p>
    <p style="margin:0 0 20px;color:#82736b;font-size:14px;line-height:1.6;">A new sign-in to your Nakconel Bank account was detected.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #e9dfd0;color:#82736b;font-size:13px;">Time</td><td style="padding:10px 0;border-bottom:1px solid #e9dfd0;font-size:13px;font-weight:600;text-align:right;">${input.time}</td></tr>
      ${input.ip ? `<tr><td style="padding:10px 0;color:#82736b;font-size:13px;">IP Address</td><td style="padding:10px 0;font-size:13px;font-weight:600;text-align:right;">${input.ip}</td></tr>` : ''}
    </table>
    <p style="margin:0;color:#82736b;font-size:13px;line-height:1.6;">If this was you, no action is needed. If you did not sign in, change your password immediately.</p>`);
  await sendEmail({ to: input.to, toName: input.toName, subject: 'New login to your Nakconel Bank account', html, text: `New login detected on your Nakconel Bank account at ${input.time}.` });
}

/** Alert: money received / wallet credited */
export async function sendMoneyReceivedEmail(input: { to: string; toName: string; amount: string; reference: string; time: string }) {
  const html = emailShell(`
    <p style="margin:0 0 6px;color:#651719;font-size:20px;font-weight:700;">Money received!</p>
    <p style="margin:0 0 20px;color:#82736b;font-size:14px;line-height:1.6;">Your Nakconel Bank wallet has been credited.</p>
    <div style="background:#f8f2e8;border:1.5px solid #c59b44;border-radius:14px;padding:20px;text-align:center;margin-bottom:20px;">
      <p style="margin:0 0 4px;color:#82736b;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Amount credited</p>
      <p style="margin:0;font-size:34px;font-weight:800;color:#3e0c11;font-family:Georgia,serif;">${input.amount}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #e9dfd0;color:#82736b;font-size:13px;">Reference</td><td style="padding:10px 0;border-bottom:1px solid #e9dfd0;font-size:13px;font-weight:600;text-align:right;">${input.reference}</td></tr>
      <tr><td style="padding:10px 0;color:#82736b;font-size:13px;">Time</td><td style="padding:10px 0;font-size:13px;font-weight:600;text-align:right;">${input.time}</td></tr>
    </table>
    <p style="margin:0;color:#82736b;font-size:13px;">Log in to your Nakconel Bank account to view your updated balance.</p>`);
  await sendEmail({ to: input.to, toName: input.toName, subject: `You received ${input.amount} — Nakconel Bank`, html, text: `Your Nakconel Bank wallet has been credited with ${input.amount}. Reference: ${input.reference}.` });
}
