// Cloudflare Pages entry point for /api/send-email. The logic (and its security
// gate) lives in server/sendEmail.js, shared with the Vercel version.
// Env vars are set in Pages > Settings > Variables and Secrets; the secret ones
// (RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY) go in as encrypted Secrets.
import { handleSendEmail } from '../../server/sendEmail.js';

export function onRequest({ request, env }) {
  return handleSendEmail(request, env);
}
