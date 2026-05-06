const https = require('https');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Forward-Accept');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const AKUITEO_URL = process.env.AKUITEO_BASE_URL || 'https://novamingenierie-test.myakuiteo.com/akuiteo/rest';
  const AKUITEO_USER = process.env.AKUITEO_USER || 'API1';
  const AKUITEO_PASS = process.env.AKUITEO_PASS || 'API1';

  const apiPath = req.query.path;
  if (!apiPath) return res.status(400).json({ error: 'Missing ?path= parameter' });

  // Forward remaining query params
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'path') params.append(key, value);
  }
  const qs = params.toString();
  const fullUrl = new URL(AKUITEO_URL + apiPath + (qs ? '?' + qs : ''));
  const auth = 'Basic ' + Buffer.from(AKUITEO_USER + ':' + AKUITEO_PASS).toString('base64');

  const postData = (req.method !== 'GET' && req.body) ? JSON.stringify(req.body) : '';

  // Autorise le client a surcharger Accept via le header X-Forward-Accept
  const accept = req.headers['x-forward-accept'] || req.headers.accept || 'application/json';
  const options = {
    hostname: fullUrl.hostname,
    path: fullUrl.pathname + fullUrl.search,
    method: req.method,
    headers: {
      'Authorization': auth,
      'Accept': accept,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  };
  if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);

  const request = https.request(options, (response) => {
    let body = '';
    response.on('data', (chunk) => { body += chunk; });
    response.on('end', () => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(response.statusCode).send(body);
    });
  });

  request.on('error', (e) => res.status(502).json({ error: e.message }));
  request.on('timeout', () => { request.destroy(); res.status(504).json({ error: 'Akuiteo API timeout' }); });
  if (postData) request.write(postData);
  request.end();
};
