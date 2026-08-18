// RETIRED 18 Aug 2026 — this endpoint is switched off.
//
// It used to forward any prompt it was given straight to Anthropic on the
// ESix10 API key, with no check on who was asking. It sat on the live domain
// where anyone could find it and run up the bill.
//
// Nothing in the app ever called it: the app uses the Supabase edge function
// `generate` instead (see src/App.jsx, the /functions/v1/generate calls), which
// requires a valid sign-in token before it will spend anything.
//
// The file is kept only as a gravestone so nobody wonders where it went. It can
// be deleted outright with:  git rm api/generate.js
export const config = {
  runtime: 'edge',
};

export default async function handler() {
  return new Response(
    JSON.stringify({ error: 'This endpoint has been retired. Use the Supabase `generate` function.' }),
    { status: 410, headers: { 'Content-Type': 'application/json' } }
  );
}
