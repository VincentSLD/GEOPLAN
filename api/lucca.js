const https = require('https');
const { URL } = require('url');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const LUCCA_URL = process.env.LUCCA_BASE_URL;
  const LUCCA_KEY = process.env.LUCCA_API_KEY;
  if (!LUCCA_URL || !LUCCA_KEY) {
    return res.status(500).json({ error: 'LUCCA_BASE_URL or LUCCA_API_KEY not configured' });
  }

  const apiPath = req.query.path;
  if (!apiPath) return res.status(400).json({ error: 'Missing ?path= parameter' });

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'path') params.append(key, value);
  }
  const qs = params.toString();
  const fullUrl = new URL(LUCCA_URL + apiPath + (qs ? '?' + qs : ''));

  const options = {
    hostname: fullUrl.hostname,
    path: fullUrl.pathname + fullUrl.search,
    method: 'GET',
    headers: {
      'Authorization': `lucca application=${LUCCA_KEY}`,
      'Accept': 'application/json',
    },
    timeout: 20000,
  };

  const request = https.request(options, (response) => {
    let body = '';
    response.on('data', (chunk) => { body += chunk; });
    response.on('end', () => {
      res.setHeader('Content-Type', response.headers['content-type'] || 'application/json');
      res.status(response.statusCode).send(body);
    });
  });

  request.on('error', (e) => res.status(502).json({ error: e.message }));
  request.on('timeout', () => { request.destroy(); res.status(504).json({ error: 'Lucca API timeout' }); });
  request.end();
};
