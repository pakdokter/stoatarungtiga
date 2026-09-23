# Stoa Fun Brewing Competition

Bracket live untuk Stoa Fun Brewing Competition, Stoa Space Selong.

- `/` : layar peserta (proyektor / HP peserta). Hanya bracket, heat LIVE disorot otomatis.
- `/admin` : panel admin (input peserta, skor, pilih heat LIVE). Dikunci PIN.

## Deploy ke Vercel

```bash
cd ~/Stoa/tarung-tiga-stoa
npx vercel --prod
```

## Sambungkan database (supaya HP peserta ikut update)

1. Buka project di vercel.com → tab **Storage** → **Create Database** → pilih **Upstash for Redis** (paket gratis) → Connect ke project ini.
   Variabel `KV_REST_API_URL` dan `KV_REST_API_TOKEN` otomatis terisi.
2. Tab **Settings → Environment Variables** → tambah `ADMIN_PIN` (misalnya 6 angka rahasia).
3. Deploy ulang: `npx vercel --prod`.
4. Buka `/admin`, masukkan PIN. Status di pojok kanan atas harus "Tersinkron".

Tanpa database, halaman tetap jalan dalam **mode lokal**: layar peserta hanya ikut berubah
di perangkat yang sama dengan admin (misalnya laptop panitia + jendela kedua di proyektor).

## File

- `index.html` : layar peserta
- `admin.html` : panel admin
- `shared.js` : mesin bracket & sinkronisasi (dipakai dua halaman)
- `api/state.js` : Vercel Function, simpan/ambil state dari Upstash Redis
