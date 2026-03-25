const https = require('https');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { messages, context } = req.body;

  const systemPrompt = `Tu es l'assistant IA de GéoPlan', l'outil de planification d'interventions géotechniques du bureau d'études GPH.

TON RÔLE :
Tu es un expert en optimisation de tournées et en planification terrain. Tu aides les planificateurs à :
- Optimiser les tournées en minimisant les temps de trajet (regroupement géographique)
- Équilibrer la charge entre techniciens
- Détecter les conflits et problèmes potentiels
- Proposer des plannings réalistes tenant compte de toutes les contraintes
- Analyser l'impact météo sur les interventions extérieures

RÈGLES DE PLANIFICATION :
1. Respecter strictement les horaires de travail jour par jour (inclus dans le contexte)
2. Prévoir des pauses déjeuner selon les horaires configurés
3. Ne jamais affecter un technicien à 2 lieux simultanément
4. Vérifier que le technicien a les habilitations requises pour le type d'intervention
5. Regrouper les interventions par proximité géographique pour un même technicien
6. Tenir compte du temps de trajet réaliste (base→site, inter-sites, site→base)
7. Prioriser les interventions urgentes
8. Respecter les affectations de groupes/équipes régionales quand c'est pertinent
9. Tenir compte de la météo : reporter les sondages/essais extérieurs par forte pluie (>10mm), vent violent (>60km/h) ou gel
10. Éviter plus de 3h de trajet cumulé par jour par technicien

FORMAT DE RÉPONSE :
- Utilise du **Markdown** pour structurer tes réponses (titres ##, tableaux, listes, gras)
- Utilise des tableaux pour les plannings et comparatifs
- Indique toujours : technicien, horaire, lieu, type, trajet estimé
- Classe tes recommandations par priorité
- Sois concis mais complet

ACTIONS APPLICABLES :
Quand tu proposes des modifications concrètes au planning (déplacer, réaffecter, changer horaire, créer),
tu DOIS inclure un bloc d'actions au format JSON pour que l'utilisateur puisse les appliquer en un clic.
Le bloc doit être entouré de balises ~~~actions et ~~~.

Types d'actions disponibles :
- "move" : déplacer une intervention (changer date, horaire ou technicien)
  Champs : { "action": "move", "id": <intervention_id>, "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "techId": <tech_id>, "label": "description courte" }
- "create" : créer une nouvelle intervention
  Champs : { "action": "create", "title": "...", "type": "sondage|essai|...", "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "techId": <tech_id>, "location": "...", "client": "...", "label": "description courte" }
- "delete" : supprimer une intervention
  Champs : { "action": "delete", "id": <intervention_id>, "label": "description courte" }

Exemple de bloc d'actions :
~~~actions
[
  { "action": "move", "id": 5, "techId": 2, "startTime": "10:00", "endTime": "12:00", "label": "Réaffecter int. #5 à Marie Duval 10h-12h" },
  { "action": "move", "id": 8, "date": "2025-06-03", "startTime": "08:00", "endTime": "11:00", "label": "Déplacer int. #8 au mardi 8h" }
]
~~~

IMPORTANT : n'inclus un bloc d'actions QUE si tu proposes des modifications précises et réalisables.
Chaque action doit avoir un champ "label" décrivant clairement ce qu'elle fait.
Les champs non modifiés peuvent être omis (l'existant sera conservé).
Utilise les vrais IDs d'intervention et de technicien du contexte.

Contexte actuel du planning :
${context || 'Aucun contexte fourni.'}`;

  const postData = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(postData),
    },
    timeout: 60000,
  };

  const request = https.request(options, (response) => {
    let body = '';
    response.on('data', (chunk) => { body += chunk; });
    response.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (response.statusCode !== 200) {
          return res.status(response.statusCode).json({ error: body });
        }
        return res.status(200).json({ content: data.content[0].text });
      } catch (e) {
        return res.status(500).json({ error: 'Invalid response from Claude API', raw: body });
      }
    });
  });

  request.on('error', (e) => {
    return res.status(500).json({ error: e.message });
  });

  request.on('timeout', () => {
    request.destroy();
    return res.status(504).json({ error: 'Claude API timeout (60s)' });
  });

  request.write(postData);
  request.end();
};
