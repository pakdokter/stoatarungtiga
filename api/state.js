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

const SESS = 'tarung-tiga-stoa:sessions', META = 'tarung-tiga-stoa:meta';
const metaOf = s => ({ code: s.code, created: s.created || 0, archived: Date.now(), stage: +s.stage || 0, draws: +s.draws || 0, count: s.count });

// Sesi: sesi lama diarsipkan (tidak dihapus), sesi aktif diganti. Hanya lewat PIN admin.
async function sessions(action, req, res, body) {
  const archive = async cur => {
    if (!cur) return;
    if (!cur.code) cur.code = 'LAMA' + Date.now().toString(36).toUpperCase();
    await redis(['HSET', SESS, cur.code, JSON.stringify(cur)]);
    await redis(['HSET', META, cur.code, JSON.stringify(metaOf(cur))]);
  };
  const curRaw = await redis(['GET', KEY]);
  const cur = curRaw ? JSON.parse(curRaw) : null;
  if (action === 'list') {
    const flat = (await redis(['HGETALL', META])) || [];
    const list = [];
    for (let i = 0; i + 1 < flat.length; i += 2) { try { list.push(JSON.parse(flat[i + 1])); } catch (e) { } }
    list.sort((a, b) => b.archived - a.archived);
    return res.status(200).json({ sessions: list, current: cur ? metaOf(cur) : null });
  }
  if (action === 'new') {
    const fresh = body && body.state;
    if (!fresh || typeof fresh.count !== 'number' || !fresh.code || (+fresh.stage || 0) !== 0) return res.status(400).json({ error: 'Data sesi baru tidak valid.' });
    if (cur && cur.code === fresh.code) return res.status(409).json({ error: 'Kode sesi sudah dipakai.', state: cur });
    await archive(cur);
    fresh.updated = Date.now();
    await redis(['SET', KEY, JSON.stringify(fresh)]);
    return res.status(200).json({ ok: true, state: fresh });
  }
  if (action === 'restore') {
    const code = String((req.query && req.query.code) || '').toUpperCase();
    const raw = code ? await redis(['HGET', SESS, code]) : null;
    if (!raw) return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
    const target = JSON.parse(raw);
    if (cur && cur.code === target.code) return res.status(200).json({ ok: true, state: cur });
    await archive(cur);
    await redis(['HDEL', SESS, code]);
    await redis(['HDEL', META, code]);
    target.updated = Date.now();
    await redis(['SET', KEY, JSON.stringify(target)]);
    return res.status(200).json({ ok: true, state: target });
  }
  return res.status(400).json({ error: 'Aksi tidak dikenal.' });
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
      const action = req.query && req.query.action;
      if (action) return await sessions(action, req, res, body);
      if (!body || typeof body !== 'object' || typeof body.count !== 'number') return res.status(400).json({ error: 'Data tidak valid.' });
      // Penguncian dijaga di server: tahap hanya naik, dan data yang sudah dikunci tidak bisa diubah.
      const curRaw = await redis(['GET', KEY]);
      const cur = curRaw ? JSON.parse(curRaw) : null;
      if (cur && cur.code && body.code && cur.code !== body.code) return res.status(409).json({ error: 'Sesi sudah berganti. Muat ulang.', state: cur });
      if (cur && (+cur.stage || 0) > 0) {
        const cs = +cur.stage || 0, ns = +body.stage || 0;
        const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
        let why = '';
        if (ns < cs) why = 'Penguncian tidak bisa dibuka lagi.';
        else if (ns > cs + 1) why = 'Tahap penguncian tidak boleh dilompati.';
        else if (!same(cur.names, body.names) || cur.count !== body.count) why = 'Daftar peserta sudah dikunci.';
        else if (cs >= 2 && (!same(cur.order, body.order) || ['mode', 'target', 'rem', 'semi', 'final', 'rows'].some(k => !same(cur[k], body[k])))) why = 'Undian sudah final dan tidak bisa diubah.';
        else if ((+body.draws || 0) < (+cur.draws || 0)) why = 'Jumlah pengacakan tidak bisa dikurangi.';
        else if (ns === 2 && cs === 1 && !((+body.draws || 0) >= 1)) why = 'Acak undian minimal sekali sebelum dikunci final.';
        if (why) return res.status(409).json({ error: why, state: cur });
      } else if ((+body.stage || 0) > 1) {
        return res.status(409).json({ error: 'Tahap penguncian tidak boleh dilompati.', state: cur });
      }
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
