# 📋 Panduan Setup: Menu Bistro Kekinian + Google Sheets

> Setelah setup selesai, klien cukup **edit Google Sheets dari HP** dan menu otomatis ter-update.

---

## LANGKAH 1 — Buat Google Sheet

1. Buka [sheets.google.com](https://sheets.google.com) → **Buat Spreadsheet baru**
2. Rename tab sheet (klik kanan tab di bawah) → nama: **`Menu`**
3. Baris pertama isi **header persis seperti ini** (case-sensitive tidak masalah):

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| name | price | category | stars | image | desc | tags | ribbon |

4. Isi data mulai baris 2. Contoh:

| name | price | category | stars | image | desc | tags | ribbon |
|---|---|---|---|---|---|---|---|
| Burger Wagyu | Rp 89.000 | main | 5 | https://... | Daging wagyu grade A... | Wagyu,Premium,Signature | Signature |
| Steak Ribeye | Rp 145.000 | main | 5 | https://... | Ribeye 250g... | Beef,Best Seller | Best Seller |
| Caesar Salad | Rp 48.000 | appetizer | 4 | https://... | Romaine lettuce... | Fresh,Light | |

### Aturan isian kolom:
- **name** → Nama menu (bebas)
- **price** → Format: `Rp 89.000` (pakai titik, bukan koma)
- **category** → Harus salah satu: `main` / `appetizer` / `dessert`
- **stars** → Angka 1–5
- **image** → URL gambar (lihat cara upload gambar di bawah)
- **desc** → Deskripsi panjang
- **tags** → Kata kunci dipisah koma, contoh: `Wagyu,Premium,Signature`
- **ribbon** → (opsional) Label merah di pojok foto: `Best Seller` / `Signature` / `New` / *(kosong)*

---

## LANGKAH 2 — Buat Google Apps Script

1. Dari Google Sheet, klik menu **Ekstensi → Apps Script**
   _(atau buka langsung: [script.google.com](https://script.google.com))_

2. Hapus semua kode default yang ada (`function myFunction() {...}`)

3. **Copy-paste isi file `apps-script/Code.gs`** dari folder ini ke editor Apps Script

4. Klik **Simpan** (ikon disket atau Ctrl+S)

5. Beri nama project (opsional): `Bistro Menu API`

---

## LANGKAH 3 — Deploy sebagai Web App

1. Klik tombol **`Deploy`** (kanan atas) → **`New Deployment`**

2. Klik ikon ⚙️ di sebelah "Select type" → pilih **`Web App`**

3. Isi konfigurasi:
   - **Description**: `Menu API v1`
   - **Execute as**: `Me (nama_email@gmail.com)`
   - **Who has access**: **`Anyone`** ← **(penting! harus Anyone)**

4. Klik **`Deploy`**

5. Popup minta izin → Klik **`Authorize access`** → pilih akun Google → **`Allow`**

6. Setelah berhasil, akan muncul **URL Web App** seperti:
   ```
   https://script.google.com/macros/s/AKfycbwXXXXXXXXXXXXXXXXX/exec
   ```
   **⚠️ Copy URL ini, jangan ditutup dulu!**

---

## LANGKAH 4 — Paste URL ke index.html

1. Buka file `index.html` di folder project

2. Cari baris ini (sekitar baris 210):
   ```javascript
   const APPS_SCRIPT_URL = 'PASTE_URL_DISINI';
   ```

3. Ganti `PASTE_URL_DISINI` dengan URL yang baru di-copy:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwXXXXXXXXX/exec';
   ```

4. **Simpan file** → Upload ke Cloudflare Pages

---

## LANGKAH 5 — Upload Gambar Makanan

Ada 3 opsi untuk URL gambar:

### Opsi A — Google Drive (termudah untuk klien)
1. Foto dari HP → upload ke Google Drive
2. Klik kanan file → **Bagikan** → ubah ke **"Siapa saja yang memiliki link"**
3. Dapatkan ID file dari URL, contoh:
   `https://drive.google.com/file/d/**FILE_ID**/view`
4. URL untuk di-paste ke Sheets:
   ```
   https://drive.google.com/uc?export=view&id=FILE_ID
   ```

### Opsi B — Cloudinary (kualitas terbaik, gratis 25GB)
1. Daftar di [cloudinary.com](https://cloudinary.com) → gratis
2. Upload foto → otomatis dapat URL HTTPS
3. Paste URL langsung ke kolom `image` di Sheets

### Opsi C — URL gambar internet
- Cari gambar di Google → klik kanan → **"Salin alamat gambar"**
- Paste langsung ke kolom `image`

---

## LANGKAH 6 — Deploy ke Cloudflare Pages

1. Buka [pages.cloudflare.com](https://pages.cloudflare.com)
2. Upload folder project (cukup `index.html` saja)
3. Web menu siap diakses!

---

## 🔄 Cara Update Menu (untuk Klien)

Setelah setup selesai, klien cukup:

```
1. Buka Google Sheets di HP
2. Edit/tambah/hapus baris menu
3. Simpan otomatis
4. Pelanggan refresh halaman → menu langsung ter-update ✅
```

**Tidak perlu:**
- ❌ Edit kode
- ❌ Upload ulang ke Cloudflare
- ❌ Kontak developer

---

## ❓ FAQ & Troubleshooting

### Menu tidak muncul / masih data lama
→ Coba buka menu di **tab incognito** (cache di-bypass)

### Gambar tidak muncul
→ Pastikan URL gambar bisa dibuka langsung di browser (bukan halaman redirect)

### Error "Gagal memuat data dari Google Sheets"
→ Periksa:
- URL di `index.html` sudah benar dan tidak ada spasi
- Deployment Apps Script menggunakan **"Who has access: Anyone"**
- Coba buka URL Apps Script langsung di browser — harus muncul JSON

### Ingin update Apps Script
→ Jika kode Apps Script diubah, harus **buat Deployment baru**:
Deploy → New Deployment → URL baru akan berbeda → update di `index.html`

### Menambah kategori baru (misal: "Drinks")
→ Edit kode di `index.html`:
- Tambah grup HTML baru dengan `data-group="drinks"`
- Tambah tombol filter baru
- Update object `CAT_LABELS` dan `grids` di JavaScript

---

## 📁 Struktur File

```
Menu book/
├── index.html          ← File utama web menu (yang di-upload ke Cloudflare)
├── apps-script/
│   └── Code.gs         ← Kode untuk di-paste ke Google Apps Script
└── PANDUAN_SETUP.md    ← File ini
```

---

*Dibuat oleh: Bistro Kekinian Dev Team*
