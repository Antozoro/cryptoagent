export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { endpoint } = req.query;
  const GH_TOKEN = process.env.GH_TOKEN;
  const CLAUDE_KEY = process.env.CLAUDE_KEY;
  const TG_TOKEN = process.env.TG_TOKEN;
  const TG_CHAT = process.env.TG_CHAT;
  const GH_API = 'https://api.github.com/repos/Antozoro/cryptoagent/contents/data.json';

  // TELEGRAM SEND
  if (endpoint === 'tg-send' && req.method === 'POST') {
    try {
      const { text } = req.body;
      const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML' })
      });
      const d = await r.json();
      return res.status(200).json({ ok: d.ok });
    } catch(e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // SYNC LOAD
  if (endpoint === 'sync-load') {
    try {
      const r = await fetch(GH_API + '?t=' + Date.now(), {
        headers: { 'Authorization': 'token ' + GH_TOKEN, 'Accept': 'application/vnd.github.v3+json' }
      });
      const d = await r.json();
      if (!d.content) return res.status(404).json({ error: 'No data found' });
      const data = JSON.parse(Buffer.from(d.content.replace(/\n/g,''), 'base64').toString());
      return res.status(200).json(data);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // SYNC SAVE
  if (endpoint === 'sync-save' && req.method === 'POST') {
    try {
      const getR = await fetch(GH_API, {
        headers: { 'Authorization': 'token ' + GH_TOKEN, 'Accept': 'application/vnd.github.v3+json' }
      });
      const getD = await getR.json();
      const sha = getD.sha;
      const body = {
        message: 'sync data',
        content: Buffer.from(JSON.stringify(req.body)).toString('base64'),
        sha
      };
      const putR = await fetch(GH_API, {
        method: 'PUT',
        headers: { 'Authorization': 'token ' + GH_TOKEN, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
        body: JSON.stringify(body)
      });
      const putD = await putR.json();
      if (putD.content) return res.status(200).json({ ok: true, sha: putD.content.sha });
      return res.status(500).json({ error: putD.message || 'Save failed' });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // CHAT AI
  if (endpoint === 'chat' && req.method === 'POST') {
    try {
      const { messages, marketContext, portfolioContext } = req.body;
      const systemPrompt = `Sei un assistente esperto di criptovalute integrato nell'app ZoronoAnto Crypto. Il tuo compito è aiutare Antonio, un neofita, a capire il mercato crypto e prendere decisioni informate.

DATI DI MERCATO LIVE:
${marketContext}

PORTAFOGLIO DI ANTONIO:
${portfolioContext}

ISTRUZIONI:
- Rispondi SEMPRE in italiano, in modo semplice e diretto
- Usa i dati live per contestualizzare ogni risposta
- Per domande su cosa comprare/vendere: dai un'opinione chiara basata sui dati, specificando che non sei un consulente finanziario
- Sii conciso: risposte brevi, usa bullet point quando utile
- Spiega i concetti con esempi pratici sui dati reali
- Tono: amichevole, come un amico esperto`;

      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages
        })
      });
      const d = await r.json();
      if (d.content) return res.status(200).json({ ok: true, reply: d.content[0].text });
      return res.status(500).json({ ok: false, error: d.error?.message || 'Claude error' });
    } catch(e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // MARKET DATA
  const urls = {
    global: 'https://api.coingecko.com/api/v3/global',
    markets: 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h,7d',
    fng: 'https://api.alternative.me/fng/'
  };
  const url = urls[endpoint];
  if (!url) return res.status(400).json({ error: 'Invalid endpoint' });
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=60');
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
