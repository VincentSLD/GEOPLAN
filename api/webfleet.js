/**
 * Vercel Serverless — Proxy Webfleet.connect API
 * Variables d'environnement requises :
 *   WEBFLEET_ACCOUNT, WEBFLEET_USERNAME, WEBFLEET_PASSWORD, WEBFLEET_APIKEY
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { WEBFLEET_ACCOUNT, WEBFLEET_USERNAME, WEBFLEET_PASSWORD, WEBFLEET_APIKEY } = process.env;
  if (!WEBFLEET_ACCOUNT || !WEBFLEET_APIKEY) {
    return res.status(500).json({ error: 'Webfleet credentials not configured' });
  }

  // action from query param or default
  const action = req.query.action || 'showObjectReportExtern';

  // Build params — forward any extra query params from the frontend
  const params = new URLSearchParams({
    ...req.query,
    action,
    account: WEBFLEET_ACCOUNT,
    username: WEBFLEET_USERNAME,
    password: WEBFLEET_PASSWORD,
    apikey: WEBFLEET_APIKEY,
    outputformat: 'json',
    lang: 'fr',
    useISO8601: 'true',
    useUTF8: 'true',
  });

  const url = `https://csv.telematics.tomtom.com/extern?${params}`;

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
    const text = await r.text();

    // Try to return as JSON, wrap if not valid JSON
    try {
      JSON.parse(text);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(r.status).send(text);
    } catch {
      return res.status(r.status).json({ raw: text, error: 'non-json response' });
    }
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Webfleet request failed' });
  }
}
