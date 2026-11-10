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
