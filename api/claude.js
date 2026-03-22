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

    const systemPrompt = `Tu es l'assistant IA de GéoPlan', un outil de planification d'interventions géotechniques pour le bureau d'études GPH.

Ton rôle est d'aider à optimiser la planification des tournées des géotechniciens. Tu dois :
- Proposer des plannings optimisés en minimisant les temps de trajet
- Regrouper les interventions par zone géographique
- Tenir compte des durées d'intervention et des temps de déplacement
- Éviter les surcharges sur un technicien
- Respecter les horaires de travail (7h-18h)
- Prioriser les interventions urgentes
- Suggérer des réorganisations quand c'est pertinent

Contexte actuel du planning :
${context || 'Aucun contexte fourni.'}

Réponds toujours en français, de manière concise et structurée. Utilise des listes et des tableaux quand c'est utile.
Quand tu proposes un planning, indique clairement : technicien, horaire, lieu, type d'intervention, et temps de trajet estimé.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
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
