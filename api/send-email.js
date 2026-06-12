export const config = {
  runtime: 'edge',
};

// Sends transactional email via Resend.
// Requires env vars on Vercel:
//   RESEND_API_KEY  (required)  — from resend.com
//   RESEND_FROM     (optional)  — e.g. "ESix10 Community <noreply@esix10.com>"
//                                 the domain must be verified in Resend
//   APP_URL         (optional)  — link used in emails (defaults to the vercel URL)
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Email not configured (RESEND_API_KEY missing)' }), { status: 500 });
  }

  const FROM = process.env.RESEND_FROM || 'ESix10 Community <onboarding@resend.dev>';
  const APP_URL = process.env.APP_URL || 'https://esix10-community-app.vercel.app';
  const LOGO = 'https://esix10.com/wp-content/uploads/2026/06/esix10logo.png';

  try {
    const { to, name, type } = await req.json();
    if (!to) {
      return new Response(JSON.stringify({ error: 'Missing "to" address' }), { status: 400 });
    }

    const first = (name || '').trim().split(' ')[0] || 'brother';

    const templates = {
      approval: {
        subject: "You're in — welcome to the ESix10 Community",
        heading: 'Welcome to the Community',
        body: `Your profile has been approved, ${first}. You now have full access to the ESix10 Community — the feed, prayer, The Forge, messages, and more.`,
        cta: 'Enter the Community',
      },
    };

    const t = templates[type] || templates.approval;

    const html = `
      <div style="background:#0d1117;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:480px;margin:0 auto;background:#161b24;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">
          <div style="text-align:center;padding:28px 24px 8px;">
            <img src="${LOGO}" alt="ESix10" style="height:64px;width:auto;" />
            <div style="color:#FF6600;font-size:10px;letter-spacing:4px;text-transform:uppercase;margin-top:6px;">Community</div>
          </div>
          <div style="padding:8px 32px 32px;">
            <h1 style="color:#ffffff;font-size:22px;font-weight:normal;text-align:center;margin:16px 0;">${t.heading}</h1>
            <p style="color:#cccccc;font-size:15px;line-height:1.7;text-align:center;">${t.body}</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${APP_URL}" style="display:inline-block;background:#FF6600;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;">${t.cta}</a>
            </div>
            <p style="color:#888888;font-size:13px;font-style:italic;text-align:center;line-height:1.7;border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;">
              "Be strong in the Lord and in his mighty power." — Ephesians 6:10
            </p>
          </div>
        </div>
      </div>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from: FROM, to, subject: t.subject, html }),
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), { status: response.status });
    }

    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
