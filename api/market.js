const CG_KEY = 'CG-MG7bs5JbpZTDcR2s6V4icDAc';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { endpoint } = req.query;

  const urls = {
    global: 'https://api.coingecko.com/api/v3/global',
    markets: 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h,7d',
    fng: 'https://api.alternative.me/fng/'
  };

  const url = urls[endpoint];
  if (!url) return res.status(400).json({ error: 'Invalid endpoint' });

  try {
    const headers = { 'Accept': 'application/json' };
    if (endpoint !== 'fng') headers['x-cg-demo-api-key'] = CG_KEY;
    
    const r = await fetch(url, { headers });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=60');
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
