# Tabunganku — Next.js + MySQL (Aiven) + Vercel

Web tabungan: catat setoran dan penarikan, atur target menabung, lihat tabungan per hari,
serta laporan harian, mingguan, dan bulanan. Struktur dan cara deploy sama seperti
project CRUD produk (Next.js App Router + MySQL Aiven + Vercel).

## Fitur

- **Target tabungan**: nama, deskripsi, target nominal, tanggal mulai, tanggal selesai (opsional).
  Ada progress bar, sisa yang harus dikumpulkan, dan perkiraan setoran per hari agar tercapai
  sebelum tanggal selesai.
- **Transaksi**: setoran atau penarikan per target (nominal, tanggal, keterangan). Ada tombol
  cepat +10rb/+20rb/+50rb/+100rb. Penarikan ditolak jika melebihi saldo target.
- **Ringkasan**: saldo, setoran hari ini / minggu ini / bulan ini, dan rata-rata setoran per hari.
- **Laporan**: tab Harian (31 hari terakhir), Mingguan (12 minggu, mulai Senin), Bulanan (12 bulan)
  dengan grafik batang, tabel setoran/penarikan/bersih, total, rata-rata, dan unduh CSV.
- **Filter target**: klik "Fokus" pada sebuah target, atau pakai dropdown di laporan.
- **Riwayat**: 30 transaksi terbaru, bisa dihapus.

## Struktur Project

```
app/
  api/target/route.js          -> GET (list + saldo), POST
  api/target/[id]/route.js     -> PUT, DELETE
  api/transaksi/route.js       -> GET (riwayat), POST (setoran / penarikan)
  api/transaksi/[id]/route.js  -> DELETE
  api/summary/route.js         -> GET ringkasan (saldo, hari/minggu/bulan ini, rata-rata)
  api/reports/route.js         -> GET laporan ?period=daily|weekly|monthly&target_id=
  page.js                      -> Halaman utama
  layout.js, globals.css
lib/
  db.js                        -> Koneksi pool MySQL (SSL Aiven)
  dates.js, format.js, target.js -> Helper tanggal, format Rupiah/tanggal, validasi
schema.sql                     -> Tabel `target_tabungan` dan `transaksi`
.env.local.example             -> Contoh environment variables
```

## 1. Database di Aiven

1. Buat service **MySQL** (plan Free) di <https://aiven.io>, tunggu status "Running".
2. Catat `Host`, `Port`, `User`, `Password`, `Database name`, lalu download **CA Certificate** (`ca.pem`).
3. Buat tabel dengan menjalankan `schema.sql`. Di Aiven, database sudah ada
   (biasanya `defaultdb`), jadi `CREATE DATABASE` dan `USE` di file itu sudah dikomentari.

```
mysql --host=<HOST> --port=<PORT> --user=<USER> --password=<PASSWORD> \
  --database=<DBNAME> --ssl-mode=REQUIRED < schema.sql
```

Untuk MySQL lokal dengan nama database `db_tabungan`, hilangkan tanda komentar pada dua baris
pertama `schema.sql` dan isi `DB_NAME=db_tabungan` di `.env.local`.

## 2. Jalankan lokal

```
npm install
cp .env.local.example .env.local   # isi dengan kredensial database
base64 -i ca.pem | tr -d '\n'      # hasilnya masuk ke DB_CA_CERT (kosongkan untuk MySQL lokal)
npm run dev
```

Buka <http://localhost:3000>.

## 3. Deploy ke Vercel

1. Push ke GitHub (pastikan `.env.local` tidak ikut, sudah ada di `.gitignore`).
2. Di Vercel: **Add New → Project**, pilih repo.
3. Isi Environment Variables yang sama dengan `.env.local`
   (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_CA_CERT`).
4. **Deploy**.

## Catatan

- Aplikasi ini belum punya login: siapa pun yang tahu URL-nya bisa melihat dan mengubah data.
  Untuk pemakaian pribadi sebaiknya tambahkan autentikasi sebelum dipublikasikan.
- Saldo = total setoran − total penarikan. Rata-rata per hari = total setoran ÷ jumlah hari
  sejak setoran pertama sampai hari ini (hari tanpa menabung ikut dihitung).
- Waktu transaksi dikirim dari browser (zona waktu lokal pengguna) dan disimpan apa adanya,
  jadi pengelompokan harian/mingguan/bulanan sesuai tanggal lokal, tidak tergeser oleh
  zona waktu server.
- Menghapus target juga menghapus semua transaksinya (ON DELETE CASCADE).
