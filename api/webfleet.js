const https = require('https');

module.exports = function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { WEBFLEET_ACCOUNT, WEBFLEET_USERNAME, WEBFLEET_PASSWORD, WEBFLEET_APIKEY } = process.env;
  if (!WEBFLEET_ACCOUNT || !WEBFLEET_APIKEY) {
    return res.status(500).json({
      error: 'Webfleet credentials not configured',
      configured: {
        WEBFLEET_ACCOUNT: !!WEBFLEET_ACCOUNT,
        WEBFLEET_USERNAME: !!WEBFLEET_USERNAME,
        WEBFLEET_PASSWORD: !!WEBFLEET_PASSWORD,
        WEBFLEET_APIKEY: !!WEBFLEET_APIKEY,
      }
    });
  }

  const action = req.query.action || 'showObjectReportExtern';

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

  const url = `https://csv.business.tomtom.com/extern?${params}`;

  const request = https.get(url, { timeout: 25000 }, (response) => {
    let body = '';
    response.on('data', (chunk) => { body += chunk; });
    response.on('end', () => {
      try {
        JSON.parse(body);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(response.statusCode).send(body);
      } catch {
        return res.status(response.statusCode).json({ raw: body, error: 'non-json response' });
      }
    });
  });

  request.on('error', (e) => {
    return res.status(502).json({ error: e.message || 'Webfleet request failed' });
  });

  request.on('timeout', () => {
    request.destroy();
    return res.status(502).json({ error: 'Webfleet API timeout (25s)' });
  });
};
