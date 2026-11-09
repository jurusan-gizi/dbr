# e-DBR Gizi — Aplikasi Sarpras Jurusan Gizi

Aplikasi DBR (Daftar Barang Ruangan) digital untuk Jurusan Gizi Poltekkes Kemenkes Makassar.
Frontend PWA di **GitHub Pages**, backend **Google Apps Script**, database **Google Sheet**.

## Isi folder

| File | Fungsi |
|---|---|
| `apps-script/Code.gs` | Backend (API, login, hak akses, database Sheet) |
| `index.html`, `app.js`, `style.css` | Aplikasi utama (dashboard, menu kiri) |
| `ruang.html` | Halaman publik saat QR pintu dipindai (baca saja) |
| `config.js` | Tempat menaruh URL Web App Apps Script |
| `manifest.webmanifest`, `sw.js`, `icons/` | Supaya bisa dipasang di HP seperti aplikasi |
| `lib/qrcode.min.js` | Pembuat QR (lisensi MIT) |

## Langkah 1 — Siapkan database & backend

1. Buka Google Drive → **Baru → Google Spreadsheet**, beri nama `Database e-DBR Gizi`.
2. Di spreadsheet: **Ekstensi → Apps Script**. Hapus isi `Code.gs` bawaan, tempel seluruh isi `apps-script/Code.gs`, lalu **Simpan**.
3. Di menu atas editor, pilih fungsi **`setup`** → klik **Jalankan**. Izinkan akses (Spreadsheet & Drive).
   - Ini membuat sheet Settings, Users, Rooms, Items, Mutasi, Rusak, Logs, Sessions, serta folder Drive "e-DBR Gizi — Foto Kerusakan".
   - Akun awal: **username `superadmin`, password `gizi2026`** → segera ganti lewat tombol *Ganti password* di aplikasi.
4. (Opsional) pilih fungsi **`isiDataContoh`** → Jalankan, untuk memasukkan data KIR lama (Kelas A & B.1.6). Lewati jika ingin mulai dari kosong.
5. Klik **Terapkan (Deploy) → Deployment baru** → jenis **Aplikasi web**:
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
   - Klik Terapkan, lalu **salin URL Web App** (berakhiran `/exec`).

## Langkah 2 — Pasang frontend di GitHub Pages

1. Buka `config.js`, ganti `API_URL` dengan URL Web App tadi.
2. Buat repository baru di GitHub (mis. `e-dbr-gizi`), unggah semua file **kecuali** folder `apps-script` (boleh ikut, tidak berpengaruh).
3. Repository → **Settings → Pages** → Source: *Deploy from a branch* → Branch `main` / root → Save.
4. Tunggu 1–2 menit. Aplikasi tersedia di `https://<akun>.github.io/e-dbr-gizi/`.

## Langkah 3 — Mulai pakai

1. Login sebagai superadmin → **Pengaturan**: isi NIP penandatangan, cek kode lokasi & tahun.
2. **Pengguna**: buat akun Pengurus Barang (Nursalim) dan akun tiap PJ Ruangan.
3. **Ruangan**: tambah ruangan (kode mis. `B.1.6`) dan pilih PJ-nya.
4. **Barang BMN**: input barang per ruangan (Kode Barang & NUP dari SAKTI).
5. **Cetak DBR** → pilih ruangan → *Cetak / Simpan PDF* (kertas A4 tegak). QR di pojok kanan atas DBR membuka daftar terkini.

## Hak akses

| Menu | Super Admin | Pengurus Barang | PJ Ruangan |
|---|---|---|---|
| Dashboard, Cetak DBR, Cek Kondisi | ✓ | ✓ | ✓ (ruangannya saja) |
| Mutasi & Laporan Kerusakan | ✓ (proses) | ✓ (proses) | ✓ (mengajukan) |
| Ruangan, Barang BMN, Rekap | ✓ | ✓ | — |
| Pengguna, Pengaturan | ✓ | — | — |

Hak akses juga dicek di server (Apps Script), bukan hanya disembunyikan di tampilan.

## Memperbarui backend

Setelah mengubah `Code.gs`: **Terapkan → Kelola deployment → ✏️ edit → Versi: Versi baru → Terapkan**. URL tetap sama, jadi `config.js` tidak perlu diubah.

## Catatan

- Password disimpan dalam bentuk hash (SHA-256 + salt), tidak bisa dibaca di Sheet. Sesi login berlaku 7 hari.
- Lupa password PJ/pengurus: super admin cukup **Pengguna → ubah → isi Reset password**.
- Tampilan publik QR bisa dimatikan di **Pengaturan** jika daftar barang tidak ingin terbuka untuk umum.
- Jangan mengubah urutan kolom di Sheet secara manual.
