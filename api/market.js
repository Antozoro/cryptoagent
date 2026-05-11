export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { endpoint } = req.query;

  // MARKET DATA
  if (req.method === 'GET') {
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

  // SYNC SAVE
  if (req.method === 'POST' && endpoint === 'sync-save') {
    const GH_TOKEN = process.env.GH_TOKEN;
    const GH_API = 'https://api.github.com/repos/Antozoro/cryptoagent/contents/data.json';
    try {
      // Get current SHA
      const getR = await fetch(GH_API, {
        headers: { 'Authorization': 'token ' + GH_TOKEN, 'Accept': 'application/vnd.github.v3+json' }
      });
      const getD = await getR.json();
      const sha = getD.sha;
      // Save new data
      const body = { message: 'sync', content: Buffer.from(JSON.stringify(req.body)).toString('base64'), sha };
      const putR = await fetch(GH_API, {
        method: 'PUT',
        headers: { 'Authorization': 'token ' + GH_TOKEN, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
        body: JSON.stringify(body)
      });
      const putD = await putR.json();
      return res.status(200).json({ ok: true, sha: putD.content?.sha });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // SYNC LOAD
  if (req.method === 'GET' && endpoint === 'sync-load') {
    const GH_TOKEN = process.env.GH_TOKEN;
    const GH_API = 'https://api.github.com/repos/Antozoro/cryptoagent/contents/data.json';
    try {
      const r = await fetch(GH_API + '?t=' + Date.now(), {
        headers: { 'Authorization': 'token ' + GH_TOKEN, 'Accept': 'application/vnd.github.v3+json' }
      });
      const d = await r.json();
      const data = JSON.parse(Buffer.from(d.content, 'base64').toString());
      return res.status(200).json(data);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'Bad request' });
}
