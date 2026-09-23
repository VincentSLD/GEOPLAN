// Envoi d'e-mails de notification via Microsoft Graph (flux app-only client_credentials).
// Utilisé par l'outil « Erreurs / Modifs » de GéoPlan pour prévenir la liste de diffusion.
//
// ♻️ RÉUTILISE la MÊME app Entra que le projet 05_CRM (permission d'APPLICATION
//    Microsoft Graph « Mail.Send » + consentement admin déjà accordés).
//    Il suffit de recopier ces variables dans le projet Vercel GéoPlan :
//      AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
//    Optionnel :
//      AZURE_MAIL_SENDER   : boîte d'envoi fixe (UPN). Si absent, l'e-mail part de
//                            la boîte du déclarant (champ "from" transmis par le front).
//      AZURE_ALLOWED_DOMAIN: domaine autorisé des destinataires (défaut "be-gph.fr").

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const TENANT = process.env.AZURE_TENANT_ID;
  const CLIENT = process.env.AZURE_CLIENT_ID;
  const SECRET = process.env.AZURE_CLIENT_SECRET;
  const ALLOWED = (process.env.AZURE_ALLOWED_DOMAIN || 'be-gph.fr').toLowerCase();
  if (!TENANT || !CLIENT || !SECRET) {
    return res.status(500).json({ error: 'Microsoft Graph non configuré (AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET).' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const subject = String(body.subject || 'Notification GéoPlan');
  const html = String(body.html || body.text || '');
  let to = Array.isArray(body.to) ? body.to : (body.to ? [body.to] : []);
  const cc = Array.isArray(body.cc) ? body.cc : [];

  // Boîte d'envoi : variable d'env dédiée, sinon expéditeur transmis par le front (déclarant)
  const sender = String(process.env.AZURE_MAIL_SENDER || body.from || '').trim();
  if (!sender || sender.indexOf('@') < 0) {
    return res.status(400).json({ error: 'Boîte d\'envoi introuvable (définir AZURE_MAIL_SENDER ou transmettre "from").' });
  }

  // Garde-fou anti-abus : uniquement des adresses du domaine autorisé
  const clean = (arr) => arr
    .map((e) => String(e || '').trim().toLowerCase())
    .filter((e) => e && e.indexOf('@') > 0 && (ALLOWED === '*' || e.endsWith('@' + ALLOWED)));
  to = clean(to);
  const ccOk = clean(cc);
  if (!to.length) return res.status(400).json({ error: 'Aucun destinataire valide (domaine ' + ALLOWED + ').' });

  try {
    // 1) Jeton applicatif (client_credentials)
    const tokenRes = await fetch('https://login.microsoftonline.com/' + encodeURIComponent(TENANT) + '/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT,
        client_secret: SECRET,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }).toString(),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      return res.status(502).json({ error: 'Échec authentification Graph', detail: tokenJson.error_description || tokenJson.error || null });
    }

    // 2) Envoi (app-only, depuis la boîte "sender")
    const message = {
      subject: subject,
      body: { contentType: 'HTML', content: html },
      toRecipients: to.map((e) => ({ emailAddress: { address: e } })),
    };
    if (ccOk.length) message.ccRecipients = ccOk.map((e) => ({ emailAddress: { address: e } }));

    const sendRes = await fetch('https://graph.microsoft.com/v1.0/users/' + encodeURIComponent(sender) + '/sendMail', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + tokenJson.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, saveToSentItems: true }),
    });
    if (sendRes.status === 202) return res.status(200).json({ ok: true, sent: to.length });
    const errText = await sendRes.text();
    return res.status(502).json({ error: 'Échec envoi Graph (' + sendRes.status + ')', detail: errText.slice(0, 500) });
  } catch (e) {
    return res.status(502).json({ error: String((e && e.message) || e) });
  }
};
