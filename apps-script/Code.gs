// ============================================================
//  BISTRO KEKINIAN — Menu API
//  Google Apps Script  (simpan di script.google.com)
// ============================================================
//
//  CARA DEPLOY:
//  1. Buka: https://script.google.com
//  2. Buat Project Baru → paste kode ini (ganti semua isi)
//  3. Klik "Deploy" → "New Deployment"
//     - Type        : Web App
//     - Execute as  : Me
//     - Who has     : Anyone
//  4. Klik Deploy → Authorize → Copy URL
//  5. Paste URL tersebut ke index.html (variable APPS_SCRIPT_URL)
//
//  KOLOM YANG DIBUTUHKAN DI SHEET (baris pertama = header):
//  name | price | category | stars | image | desc | tags | ribbon
//
//  Nilai kolom "category": main / appetizer / dessert
//  Nilai kolom "ribbon"  : Best Seller / Signature / New / (kosong)
// ============================================================

const SHEET_TAB = "Menu"; // Ganti jika nama tab sheet berbeda

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_TAB) || ss.getActiveSheet();
    const raw = sheet.getDataRange().getValues();

    if (raw.length < 2) {
      return respond({
        status: "error",
        message: "Sheet kosong. Tambahkan header dan data menu.",
      });
    }

    // Baris 1 = header, normalisasi jadi lowercase+underscore
    const headers = raw[0].map((h) =>
      String(h).trim().toLowerCase().replace(/\s+/g, "_"),
    );

    // Baris 2 dst = data, skip baris kosong
    const items = raw
      .slice(1)
      .filter((row) => row[0] && String(row[0]).trim() !== "")
      .map((row) => {
        const obj = {};
        headers.forEach((h, i) => {
          const val =
            row[i] !== undefined && row[i] !== null
              ? String(row[i]).trim()
              : "";
          obj[h] = val;
        });
        return obj;
      });

    return respond({ status: "ok", total: items.length, data: items });
  } catch (err) {
    return respond({ status: "error", message: err.toString() });
  }
}

// Helper: return JSON response
function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
