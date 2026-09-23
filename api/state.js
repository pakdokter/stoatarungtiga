// Vercel Serverless Function: menyimpan & membagikan state bracket Stoa Fun Brewing Competition.
// Butuh Upstash Redis (Vercel Marketplace) dan env ADMIN_PIN.
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_PIN = process.env.ADMIN_PIN;
const KEY = 'tarung-tiga-stoa:state';

async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

export default async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ configured: false, error: 'Database Upstash Redis belum dihubungkan ke project Vercel.' });
  }
  try {
    if (req.method === 'GET') {
      const raw = await redis(['GET', KEY]);
      // CDN Vercel menahan respons 1 detik supaya ratusan HP penonton tidak membebani database.
      res.setHeader('Cache-Control', 'public, s-maxage=1, stale-while-revalidate=2');
      return res.status(200).json({ configured: true, state: raw ? JSON.parse(raw) : null });
    }
    if (req.method === 'POST') {
      res.setHeader('Cache-Control', 'no-store');
      if (!ADMIN_PIN) return res.status(503).json({ configured: true, error: 'ADMIN_PIN belum diatur di Environment Variables.' });
      if ((req.headers['x-admin-pin'] || '') !== ADMIN_PIN) return res.status(401).json({ error: 'PIN salah.' });
      if (req.query && req.query.check) return res.status(200).json({ ok: true });
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);
      if (!body || typeof body !== 'object' || typeof body.count !== 'number') return res.status(400).json({ error: 'Data tidak valid.' });
      const str = JSON.stringify(body);
      if (str.length > 400000) return res.status(413).json({ error: 'Data terlalu besar.' });
      await redis(['SET', KEY, str]);
      return res.status(200).json({ ok: true, updated: body.updated || null });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method tidak didukung.' });
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ configured: true, error: String(e.message || e) });
  }
}
