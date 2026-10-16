# Stoa Fun Brewing Competition

Bracket live untuk Stoa Fun Brewing Competition, Stoa Space Selong.

- `/` : layar peserta (proyektor / HP peserta). Hanya bracket, heat LIVE disorot otomatis.
- `/admin` : panel admin (input peserta, skor, pilih heat LIVE). Dikunci PIN.
- `/aturan` : aturan & regulasi lomba (statis, terbuka untuk semua).

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

## Alur hari undian (penguncian)

1. **Daftar peserta**: layar peserta (`/`) menampilkan semua nama dan coffeeshop. Admin mengedit daftar di `/admin`.
2. **Kunci daftar peserta** (ketik `KUNCI`): nama tidak bisa ditambah, dikurangi, atau diganti lagi.
3. **Acak undian**: bisa ditekan berkali-kali. Tiap pengacakan diputar langsung di layar peserta dan bagan sementara tampil dengan label "belum final".
4. **Kunci undian final** (ketik `FINAL`): susunan heat dan format bracket tidak bisa diubah. Skor tetap bisa diisi.

Penguncian tidak bisa dibuka dari admin dan dijaga di server (`api/state.js` menolak perubahan dengan status 409).
Darurat: hapus key `tarung-tiga-stoa:state` di Upstash Redis untuk mengulang dari awal.

## Mode layar peserta

Di admin (bar atas bagan) pilih **Layar peserta**:
- **Bagan lengkap (hari undian)**: seluruh bagan knockout tampil, tiga heat semifinal (kiri, kanan, bawah) menuju Final di tengah, kualifikasi di atas. Ini default.
- **Pertandingan live**: sorotan heat yang sedang bertanding. Otomatis aktif saat admin memilih heat LIVE.

## Tayangan undian

Di admin, klik **▶ Tayangkan undian ke layar peserta**. Layar peserta yang sedang terbuka memutar animasi:
semua nama tampil dulu, lalu diundi satu per satu ke tiap heat (sesuai hasil **Acak undian** saat itu).
Acak dulu, baru tayangkan. Halaman yang dibuka setelah tombol ditekan tidak memutar ulang.

## File

- `index.html` : layar peserta
- `admin.html` : panel admin
- `aturan.html` : halaman aturan & regulasi lomba (statis, publik, di `/aturan`)
- `shared.js` : mesin bracket & sinkronisasi (dipakai dua halaman)
- `api/state.js` : Vercel Function, simpan/ambil state dari Upstash Redis
