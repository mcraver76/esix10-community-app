// Vercel entry point for /api/send-email. The logic (and its security gate)
// lives in server/sendEmail.js, shared with the Cloudflare Pages version.
import { handleSendEmail } from '../server/sendEmail.js';

export const config = {
  runtime: 'edge',
};

export default function handler(req) {
  return handleSendEmail(req, process.env);
}
