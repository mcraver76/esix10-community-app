export const config = {
  runtime: 'edge',
};

// Sends transactional email via Resend.
//
// Requires env vars on Vercel:
//   RESEND_API_KEY             (required) — from resend.com
//   SUPABASE_URL               (required) — https://bffcrhjdibxqfmdreksi.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  (required) — Supabase dashboard > Settings > API
//                                           SECRET. Never put this in src/.
//   RESEND_FROM                (optional) — e.g. "ESix10 Community <noreply@esix10.com>"
//                                           the domain must be verified in Resend
//   APP_URL                    (optional) — link used in emails
//
// ---------------------------------------------------------------------------
// WHY THERE IS A CHECK AT THE TOP (added 18 Aug 2026)
//
// This endpoint used to accept any request at all. Anyone who found the URL
// could make it send ESix10-branded mail, from the verified esix10.com domain,
// to any address they liked. The wording is fixed by the templates below, so
// the risk was never nasty content going out in ESix10's name — it was the
// domain's sending reputation. Enough junk from esix10.com and the mailbox
// providers start putting the REAL approval emails in spam.
//
// The two kinds of email are proved differently, because they happen at
// different moments:
//
//   approval — sent by a signed-in admin or moderator pressing Approve, so we
//              require their sign-in token and check their role.
//
//   signup   — sent moments after someone creates an account, when they are not
//              signed in yet (email confirmation is on, so there is no session).
//              There is no token to check, so instead the caller passes the new
//              account's id and we ask Supabase, using the service key: does
//              this account exist, does its email match, was it made in the last
//              15 minutes, and is it still unconfirmed? Only then do we send.
//              A stranger cannot fake that — they would have to create a real
//              account first, which already sends exactly one email to exactly
//              that address.
// ---------------------------------------------------------------------------

const SIGNUP_WINDOW_MS = 15 * 60 * 1000;

function deny(reason, status = 401) {
  return new Response(JSON.stringify({ error: reason }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Is the person asking a signed-in admin or moderator?
async function callerIsStaff(req, supabaseUrl, anonKey) {
  const auth = req.headers.get('authorization') || '';
  if (!auth.toLowerCase().startsWith('bearer ')) return false;
  const token = auth.slice(7).trim();
  if (!token || token === anonKey) return false; // the public key is not a sign-in

  const who = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!who.ok) return false;
  const user = await who.json();
  if (!user?.id) return false;

  const prof = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } }
  );
  if (!prof.ok) return false;
  const rows = await prof.json();
  return ['admin', 'moderator'].includes(rows?.[0]?.role);
}

// Was this account genuinely created in the last few minutes, for this address?
async function isFreshSignup(userId, toAddress, supabaseUrl, serviceKey) {
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) return false;

  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) return false;
  const user = await res.json();
  if (!user?.id) return false;

  const sameAddress =
    (user.email || '').trim().toLowerCase() === (toAddress || '').trim().toLowerCase();
  const createdAt = Date.parse(user.created_at || '');
  const isRecent = Number.isFinite(createdAt) && Date.now() - createdAt < SIGNUP_WINDOW_MS;
  const notYetConfirmed = !user.email_confirmed_at;

  return sameAddress && isRecent && notYetConfirmed;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Email not configured (RESEND_API_KEY missing)' }), { status: 500 });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ANON_KEY = process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    // Fail closed. An unchecked send is what this change exists to prevent, so
    // a missing setting must stop the email rather than wave it through.
    return new Response(
      JSON.stringify({ error: 'Email not configured (Supabase keys missing on the server)' }),
      { status: 500 }
    );
  }

  const FROM = process.env.RESEND_FROM || 'ESix10 Community <onboarding@resend.dev>';
  const APP_URL = process.env.APP_URL || 'https://esix10-community-app.vercel.app';
  const LOGO = 'https://community.esix10.com/esix10logo.png';

  try {
    const { to, name, type, userId } = await req.json();
    if (!to) {
      return new Response(JSON.stringify({ error: 'Missing "to" address' }), { status: 400 });
    }
    if (type !== 'approval' && type !== 'signup') {
      return new Response(JSON.stringify({ error: 'Unknown email type' }), { status: 400 });
    }

    // ---- the gate -----------------------------------------------------------
    if (type === 'approval') {
      if (!(await callerIsStaff(req, SUPABASE_URL, ANON_KEY))) {
        return deny('Approval emails can only be sent by a signed-in admin or moderator.');
      }
    } else {
      if (!(await isFreshSignup(userId, to, SUPABASE_URL, SERVICE_KEY))) {
        return deny('Signup emails can only be sent for an account that was just created.');
      }
    }
    // -------------------------------------------------------------------------

    const first = (name || '').trim().split(' ')[0] || 'brother';

    const templates = {
      approval: {
        subject: "You're in — welcome to the ESix10 Community",
        heading: 'Welcome to the Community',
        body: `Your profile has been approved, ${first}. You now have full access to the ESix10 Community — the feed, prayer, The Forge, messages, and more.`,
        cta: 'Enter the Community',
      },
      signup: {
        subject: 'We received your ESix10 application',
        heading: 'Application Received',
        body: `Thanks for joining, ${first}. Your profile is being reviewed by an admin — you'll get an email here the moment you're approved (usually within 24–48 hours). In the meantime, you can sign in and start exploring the community.`,
        cta: 'Sign In & Look Around',
        note: 'Add noreply@esix10.com to your contacts and check your spam or junk folder, so your approval email does not get missed.',
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
            ${t.note ? `<div style="background:rgba(255,102,0,0.08);border:1px solid rgba(255,102,0,0.2);border-radius:8px;padding:14px 18px;margin:20px 0;"><p style="color:#FFB066;font-size:13px;line-height:1.6;margin:0;text-align:center;">📬 ${t.note}</p></div>` : ''}
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
