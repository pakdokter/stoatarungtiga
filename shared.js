/* Tarung Tiga Stoa: engine bersama untuk layar peserta dan admin */
(function (g) {
  'use strict';
  const SAMPLE = ["Ari Wiranata - Kopi Tiga Gili", "Baiq Nurul - Senja Brew Bar", "Candra Putra - Ladang Roastery", "Dewi Lestari - Kopi Tiga Gili", "Eka Saputra - Rumah Seduh Masbagik", "Fajar Hidayat - Stoa Space", "Gita Maharani - Pojok Filter", "Hendra Kurnia - Ladang Roastery", "Intan Permata - Senja Brew Bar", "Joko Susilo - Kedai Sembalun", "Kiki Amelia - Stoa Space", "Lalu Rizky - Rumah Seduh Masbagik", "Maya Sari - Pojok Filter", "Nanda Pratama - Kedai Sembalun", "Oki Setiawan - Kopi Tiga Gili", "Putri Ayu - Ladang Roastery", "Rahmat Hadi - Senja Brew Bar", "Sinta Dewi - Pojok Filter", "Taufik Akbar - Stoa Space", "Wulan Anggraini - Kedai Sembalun"];
  const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h18l-1.6-10-4.6 4.2L12 5.5 9.2 12.2 4.6 8z" fill="currentColor"/><rect x="3" y="19.5" width="18" height="2" rx="1" fill="currentColor"/></svg>';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffleArr = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function defState() {
    return { count: 20, names: SAMPLE.slice(), sample: true, final: 3, semi: 3, rem: 'bye', rows: [], order: shuffleArr([...Array(20).keys()]), res: {}, mins: 12, stations: 1, live: null, showScores: 'done', updated: 0 };
  }
  function normalize(src) {
    const o = Object.assign(defState(), src && typeof src === 'object' ? src : {});
    o.final = 3; o.semi = o.semi ? 3 : 0; o.rem = o.rem === 'two' ? 'two' : 'bye';
    o.count = Math.max(3, Math.min(256, Math.round(+o.count) || 3));
    o.names = Array.isArray(o.names) ? o.names.map(x => String(x == null ? '' : x)) : [];
    o.rows = Array.isArray(o.rows) ? o.rows.map(r => ({ h: 3, T: Math.max(1, Math.round(+(r && r.T)) || 3) })) : [];
    if (!o.res || typeof o.res !== 'object') o.res = {};
    if (!['all', 'done', 'none'].includes(o.showScores)) o.showScores = 'done';
    if (o.live && (typeof o.live.k !== 'string' || !(o.live.h >= 0))) o.live = null;
    const N = o.count;
    if (!Array.isArray(o.order) || o.order.length !== N || new Set(o.order).size !== N || o.order.some(x => !(x >= 0 && x < N))) o.order = [...Array(N).keys()];
    return o;
  }

  function engine(S) {
    const eOf = () => { const st = S(); return st.semi ? st.final * st.semi : st.final; };
    const splitEntry = str => { const t = String(str || '').trim(); const m = t.match(/^(.*?)\s+[-–—|]\s+(.*)$/) || t.match(/^(.*?)\s*\|\s*(.*)$/); return m ? { n: m[1].trim(), s: m[2].trim() } : { n: t, s: '' }; };
    const nameOf = id => splitEntry(S().names[id]).n || ('Peserta ' + (id + 1));
    const shopOf = id => splitEntry(S().names[id]).s;
    const fullOf = id => { const s = shopOf(id); return nameOf(id) + (s ? ' - ' + s : ''); };
    const kindName = n => n === 1 ? 'Bye' : n === 2 ? 'Isi 2' : n === 3 ? 'Tarung Tiga' : n + ' orang';

    function distribute(arr, H) { const n = arr.length, base = Math.floor(n / H), ex = n % H, out = []; let p = 0; for (let i = 0; i < H; i++) { const s = base + (i < ex ? 1 : 0); out.push(arr.slice(p, p + s)); p += s; } return out; }
    function splitBy(arr, sizes) { const out = []; let p = 0; sizes.forEach(z => { out.push(arr.slice(p, p + z)); p += z; }); return out; }
    function heatSizes(n) {
      const f = Math.floor(n / 3), r = n % 3;
      if (!r) return Array(f).fill(3);
      if (S().rem === 'bye' || f === 0) return Array(f).fill(3).concat(Array(r).fill(1));
      return distribute(Array(n).fill(0), Math.ceil(n / 3)).map(h => h.length);
    }
    function candidates(N, E) {
      const out = []; if (N <= E) return out;
      for (let m = 1; m <= 5; m++) {
        const T = new Array(m); T[m - 1] = E;
        for (let j = m - 2; j >= 0; j--) T[j] = T[j + 1] * 3;
        if (T[0] >= N) continue;
        const heats0 = heatSizes(N).length, adj = heats0 - T[0], cuts = Math.max(0, adj), ll = Math.max(0, -adj);
        if (ll > 1 && ll > heats0 * 0.5) continue;
        if (cuts > 1 && cuts > heats0 * 0.4) continue;
        out.push({ rows: T.map(t => ({ h: 3, T: t })), cost: cuts * 1.5 + ll + m * 0.4, cuts, ll });
      }
      out.sort((a, b) => a.cost - b.cost);
      if (!out.length) { const h0 = heatSizes(N).length; out.push({ rows: [{ h: 3, T: E }], cost: 99, cuts: Math.max(0, h0 - E), ll: Math.max(0, E - h0) }); }
      return out.slice(0, 4);
    }
    function autoPlan() { const st = S(); const c = candidates(st.count, eOf()); st.rows = c.length ? c[0].rows.map(r => ({ ...r })) : []; }

    function evalHeat(members, res) {
      if (members.some(m => m.id == null)) return { ready: false };
      const ids = members.map(m => m.id);
      const sc = id => { const v = res[id] && res[id].s; const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : null; };
      if (ids.length === 1) return { ready: true, order: ids, determined: 1, complete: true, tie: false, sc, bye: true };
      const pick = ids.find(id => res[id] && res[id].w);
      const rest = ids.filter(id => id !== pick).sort((x, y) => { const a = sc(x), b = sc(y); if (a == null && b == null) return 0; if (a == null) return 1; if (b == null) return -1; return b - a; });
      const order = pick != null ? [pick, ...rest] : rest;
      const complete = ids.every(id => sc(id) != null);
      let determined = 0, tie = false;
      if (complete) { determined = order.length; for (let i = pick != null ? 1 : 0; i < order.length - 1; i++) { if (sc(order[i]) === sc(order[i + 1])) { determined = i; tie = true; break; } } }
      else if (pick != null) determined = ids.length === 2 ? 2 : 1;
      return { ready: true, order, determined, complete, tie, sc, pick };
    }

    function simulate() {
      const st = S(), N = st.count, F = st.final, E = eOf(), specs = [];
      if (N > E) st.rows.forEach((r, i) => specs.push({ kind: 'pre', label: 'Babak ' + (i + 1), short: 'B' + (i + 1), h: 3, T: i === st.rows.length - 1 ? E : r.T, row: i }));
      if (st.semi && N > F) specs.push({ kind: 'semi', label: 'Semifinal', short: 'SF', H: F, T: F });
      specs.push({ kind: 'final', label: 'Final', short: 'FN', H: 1, T: 0 });
      let ent = st.order.map(id => ({ id })); const rounds = [];
      for (const sp of specs) {
        const n = ent.length;
        if (sp.kind !== 'final' && n <= sp.T) { rounds.push({ sp, skipped: true, n }); continue; }
        const heats = sp.H ? distribute(ent, Math.max(1, Math.min(n, sp.H))) : splitBy(ent, heatSizes(n));
        const H = heats.length, res = st.res[sp.short] || {};
        const evals = heats.map(h => evalHeat(h, res));
        const rd = { sp, n, H, heats, evals, status: new Map(), notes: [], warn: '' };
        if (sp.kind === 'final') { const ev = evals[0]; if (ev.ready) ev.order.forEach((id, k) => { if (k < ev.determined) rd.status.set(id, 'p' + (k + 1)); }); rounds.push(rd); break; }
        let T = sp.T; if (T >= n) { T = n - 1; rd.warn = 'Lolos (' + sp.T + ') harus lebih kecil dari peserta masuk (' + n + '), dipakai ' + T + '.'; } if (T < 1) T = 1; rd.T = T;
        const a = Math.floor(T / H); let short = 0; const next = [], advDone = [];
        heats.forEach((hm, hi) => {
          const ev = evals[hi], k = Math.min(a, hm.length); short += a - k; let done = true;
          for (let j = 0; j < k; j++) {
            if (ev.ready && ev.determined > j) { const id = ev.order[j]; next.push({ id }); rd.status.set(id, 'win'); }
            else { done = false; next.push({ ph: a === 1 ? 'Juara ' + sp.short + '-H' + (hi + 1) : '#' + (j + 1) + ' ' + sp.short + '-H' + (hi + 1) }); }
          }
          advDone.push(done);
        });
        const r = T - a * H + short; rd.a = a; rd.r = r; let poolDone = true;
        if (r > 0) {
          const ready = evals.every(e => e.ready && e.complete && !(e.tie && e.determined <= a)); let picks = null;
          if (ready) {
            const pool = [];
            heats.forEach((hm, hi) => { const ev = evals[hi], k = Math.min(a, hm.length); ev.order.slice(k).forEach((id, j) => pool.push({ id, rank: j + k, s: ev.sc(id) })); });
            pool.sort((x, y) => x.rank - y.rank || ((y.s == null ? -1e9 : y.s) - (x.s == null ? -1e9 : x.s)));
            if (pool.length > r && pool[r - 1].rank === pool[r].rank && pool[r - 1].s === pool[r].s) rd.tieCut = true; else picks = pool.slice(0, r);
          }
          if (picks) picks.forEach(p => { next.push({ id: p.id }); rd.status.set(p.id, 'll'); });
          else { poolDone = false; for (let j = 0; j < r; j++) next.push({ ph: (a === 0 ? 'Skor terbaik ' : 'Lucky loser ') + sp.short + ' #' + (j + 1) }); }
        }
        heats.forEach((hm, hi) => { if (evals[hi].ready && advDone[hi] && poolDone) hm.forEach(m => { if (!rd.status.has(m.id)) rd.status.set(m.id, 'out'); }); });
        const byes = heats.filter(h => h.length === 1).length, twos = heats.filter(h => h.length === 2).length;
        if (byes) rd.notes.push(byes + ' bye (' + n + ' tidak habis dibagi 3)');
        if (twos) rd.notes.push(twos + ' heat isi 2');
        if (a === 0) rd.notes.push((H - T) + ' juara heat dgn skor terendah gugur');
        else { if (a > 1) rd.notes.push(a + ' teratas tiap heat lolos'); if (r > 0) rd.notes.push('+' + r + ' lucky loser (' + (a === 1 ? 'runner-up' : 'peringkat ' + (a + 1)) + ' skor tertinggi)'); }
        if (!rd.notes.length) rd.notes.push('Juara tiap heat lolos');
        rounds.push(rd); ent = next;
      }
      return { rounds, N, E, F };
    }

    /* wait | bye | done | tie | tiecut | waitpool | play */
    function heatState(rd, hi) {
      const hm = rd.heats[hi], ev = rd.evals[hi], isF = rd.sp.kind === 'final', size = hm.length;
      if (!ev.ready) return 'wait';
      if (size === 1) return 'bye';
      const done = isF ? ev.determined >= size : hm.every(m => rd.status.has(m.id));
      if (done) return 'done';
      if (ev.tie) return 'tie';
      if (!isF && rd.tieCut && ev.complete) return 'tiecut';
      if (!isF && ev.complete && rd.r > 0) return 'waitpool';
      return 'play';
    }
    /* heat yang tampil sebagai LIVE: dipilih admin, atau otomatis heat berikutnya yang belum selesai */
    function liveOf(sim, pinned) {
      const rs = sim.rounds.filter(r => !r.skipped);
      const p = pinned === undefined ? S().live : pinned;
      if (p) { const ri = rs.findIndex(r => r.sp.short === p.k); if (ri >= 0 && p.h < rs[ri].heats.length) return { ri, hi: p.h, pinned: true }; }
      for (const want of [['play', 'tie'], ['tiecut']]) {
        for (let ri = 0; ri < rs.length; ri++) for (let hi = 0; hi < rs[ri].heats.length; hi++) if (want.includes(heatState(rs[ri], hi))) return { ri, hi, pinned: false };
      }
      for (let ri = 0; ri < rs.length; ri++) for (let hi = 0; hi < rs[ri].heats.length; hi++) if (heatState(rs[ri], hi) === 'wait') return { ri, hi, pinned: false };
      return { ri: rs.length - 1, hi: 0, pinned: false, finished: true };
    }
    const heatLabel = (rd, hi) => rd.sp.kind === 'final' ? 'Final' : rd.sp.short + '-H' + (hi + 1);

    return { eOf, splitEntry, nameOf, shopOf, fullOf, kindName, distribute, splitBy, heatSizes, candidates, autoPlan, evalHeat, simulate, heatState, liveOf, heatLabel };
  }

  /* Sinkronisasi: server (Vercel + Upstash) bila tersedia, selain itu antar-tab di perangkat yang sama */
  const Sync = {
    LKEY: 'tarung-tiga-stoa-live',
    bc: ('BroadcastChannel' in g) ? new BroadcastChannel('tarung-tiga-stoa') : null,
    async get() {
      try {
        const r = await fetch('/api/state', { cache: 'no-store' });
        let j = null; try { j = await r.json(); } catch (e) { }
        if (!j || r.status === 404 || (r.status === 503 && j.configured === false)) return { configured: false };
        if (!r.ok) return { configured: true, error: true };
        return { configured: true, state: j.state || null };
      } catch (e) { return { configured: false, offline: true }; }
    },
    async put(state, pin) {
      const r = await fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': pin }, body: JSON.stringify(state) });
      return r.status;
    },
    async check(pin) {
      const r = await fetch('/api/state?check=1', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': pin }, body: '{}' });
      return r.status;
    },
    local(state) {
      try { localStorage.setItem(this.LKEY, JSON.stringify(state)); } catch (e) { }
      try { this.bc && this.bc.postMessage(state); } catch (e) { }
    },
    readLocal() { try { return JSON.parse(localStorage.getItem(this.LKEY)); } catch (e) { return null; } },
    onLocal(cb) {
      if (this.bc) this.bc.onmessage = e => cb(e.data);
      g.addEventListener('storage', e => { if (e.key === this.LKEY && e.newValue) { try { cb(JSON.parse(e.newValue)); } catch (_) { } } });
    }
  };

  g.TTS = { SAMPLE, CROWN, esc, shuffleArr, defState, normalize, engine, Sync };
})(window);
