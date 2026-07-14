// ============================================================
//  BISTRO KEKINIAN — Menu API v3 (Secure CRUD)
//  Google Apps Script
// ============================================================

const SHEET_TAB = "Menu"; // Ganti jika nama tab sheet berbeda
const ADMIN_PIN = "123456"; // PIN rahasia kamu, aman di server Google, tidak bisa di-inspect browser!

function doOptions(e) {
  // Merespons CORS preflight request (OPTIONS)
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    });
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_TAB) || ss.getActiveSheet();
    const raw = sheet.getDataRange().getValues();

    if (raw.length < 2) {
      return respond({ status: "error", message: "Sheet kosong. Tambahkan header dan data menu." });
    }

    const headers = raw[0].map((h) => String(h).trim().toLowerCase().replace(/\s+/g, "_"));

    const items = [];
    for (let i = 1; i < raw.length; i++) {
      const row = raw[i];
      if (row[0] && String(row[0]).trim() !== "") {
        const obj = { id: i + 1 }; // id adalah nomor baris di spreadsheet
        headers.forEach((h, colIdx) => {
          const val = (row[colIdx] !== undefined && row[colIdx] !== null) ? String(row[colIdx]).trim() : "";
          obj[h] = val;
        });
        items.push(obj);
      }
    }

    return respond({ status: "ok", total: items.length, data: items });
  } catch (err) {
    return respond({ status: "error", message: err.toString() });
  }
}

function doPost(e) {
  try {
    let req;
    if (e.postData && e.postData.contents) {
      req = JSON.parse(e.postData.contents);
    } else {
      return respond({ status: "error", message: "Invalid request payload" });
    }

    const action = req.action;
    const clientPin = req.pin;

    // 1. Verifikasi PIN terlebih dahulu untuk SEMUA aksi POST
    if (!clientPin || clientPin !== ADMIN_PIN) {
      return respond({ status: "error", message: "Akses ditolak: PIN tidak valid atau salah!" });
    }

    // Jika aksinya hanya cek login PIN
    if (action === "login") {
      return respond({ status: "ok", message: "PIN valid" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_TAB) || ss.getActiveSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = req.data;

    if (action === "add") {
      const newRow = headers.map(h => {
        const key = String(h).trim().toLowerCase().replace(/\s+/g, "_");
        return data[key] !== undefined ? data[key] : "";
      });
      sheet.appendRow(newRow);
      return respond({ status: "ok", message: "Menu berhasil ditambahkan." });

    } else if (action === "edit") {
      const rowId = parseInt(req.id, 10);
      if (!rowId || rowId < 2) return respond({ status: "error", message: "Invalid ID (Row Index)." });

      headers.forEach((h, colIdx) => {
        const key = String(h).trim().toLowerCase().replace(/\s+/g, "_");
        if (data[key] !== undefined) {
          sheet.getRange(rowId, colIdx + 1).setValue(data[key]);
        }
      });
      return respond({ status: "ok", message: "Menu berhasil diubah." });

    } else if (action === "delete") {
      const rowId = parseInt(req.id, 10);
      if (!rowId || rowId < 2) return respond({ status: "error", message: "Invalid ID (Row Index)." });

      sheet.deleteRow(rowId);
      return respond({ status: "ok", message: "Menu berhasil dihapus." });
    }

    return respond({ status: "error", message: "Unknown action" });

  } catch (err) {
    return respond({ status: "error", message: err.toString() });
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
}
