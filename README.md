# OpsMetrics — Dasbor KPI Tiket

Dashboard KPI responsif untuk file ekspor tiket operasional. React + Vite, Tailwind CSS, Recharts, PapaParse, dan Lucide React. CSV diproses sepenuhnya di browser — tidak ada backend dan data tidak dikirim ke server.

## Mulai

Prasyarat: Node.js 18+ dan npm.

```bash
npm install
npm run dev
```

Buka URL lokal yang ditampilkan Vite, lalu seret file CSV ke area unggah atau klik **Jelajahi file**. Pilih **Muat contoh data demo** untuk mencoba tampilan tanpa file Anda. Demo memakai data sintetis dan tidak memuat data KPI privat.

## Produksi

```bash
npm run build
npm run preview
```

Folder hasil build ada di `dist/`.

## Deploy gratis

### Vercel

1. Impor repository proyek ke Vercel.
2. Framework preset: **Vite**; build command: `npm run build`; output directory: `dist`.
3. Tidak diperlukan environment variable atau backend.

### Netlify

1. Impor repository ke Netlify.
2. Build command: `npm run build`; publish directory: `dist`.
3. Tidak diperlukan environment variable atau backend.

## Kolom CSV

File KPI yang disediakan memakai delimiter titik koma (`;`) dan header pada baris pertama. Kolom yang digunakan:

- `DateOccured` — tren dan filter tanggal. Format `DD-MM-YYYY HH:mm:ss`.
- `Ticket Status` — status tiket, tiket terbuka.
- `SLA` — IN SLA / OUT SLA.
- `MTTR (Hours)` — rata-rata MTTR.
- `Severity`, `Rootcause Category`, `Cluster`, `NOP` — sebaran dan filter.
- `Site`, `Site Name`, `WO Ticket No`, `Rootcause 1`, `PIC Name`, `Remarks` — tabel data.

Nama header dikenali tanpa membedakan kapitalisasi dan spasi berlebih. Kolom yang tidak ada tidak dipakai; dashboard memberi petunjuk kolom inti yang hilang.

## Definisi KPI

- **Total tiket:** jumlah baris yang sesuai filter. Satu WO duplikat tetap dihitung sebagai satu baris tiket.
- **Kepatuhan SLA:** `IN SLA ÷ (IN SLA + OUT SLA)`. Nilai yang tidak dikenal tidak masuk penyebut.
- **MTTR rata-rata:** rata-rata `MTTR (Hours)` untuk status `CLOSED` saja; nilai negatif/non-numerik dikecualikan. Median dan jumlah sampel juga ditampilkan.
- **Tiket terbuka:** setiap status selain `CLOSED` atau `RESOLVED`.
- **Tren:** jumlah tiket per bulan jika rentang berisi lebih dari 62 hari berbeda, selain itu per hari. Baris tanpa tanggal tidak dimasukkan ke tren, tetapi tetap dihitung oleh KPI jika filter tanggal tidak aktif.
- **Akar masalah kosong:** ditampilkan sebagai “Belum diisi”. Kategori berjumlah kecil digabung ke “Lainnya”.

Tabel utama menampilkan 50 baris per halaman dan mengekspor baris yang sudah terfilter sebagai CSV bertitik koma. Setiap grafik juga dapat dialihkan ke tampilan tabel untuk mengakses nilai tepat.

## Privasi dan batas ukuran

File tidak diunggah; parsing, penghitungan, filter, dan ekspor dilakukan lokal di perangkat. Uploader menerima CSV hingga 150 MB. Jangan taruh CSV produksi di `public/` atau commit file sensitif ke repository.
