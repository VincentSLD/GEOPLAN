export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  try {
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

Contexte actuel du planning :
${context || 'Aucun contexte fourni.'}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    return res.status(200).json({ content: data.content[0].text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
