// ============================================================
//  BISTRO KEKINIAN — Menu API v2 (CRUD)
//  Google Apps Script
// ============================================================

const SHEET_TAB = "Menu"; // Ganti jika nama tab sheet berbeda

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
    // Looping dari baris 2 (index array 1)
    for (let i = 1; i < raw.length; i++) {
      const row = raw[i];
      // Jika kolom pertama (name) tidak kosong
      if (row[0] && String(row[0]).trim() !== "") {
        const obj = { id: i + 1 }; // id merepresentasikan nomor baris di spreadsheet (baris 1 itu header, jadi baris data mulai dari 2)
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
    // Apps Script doPost untuk JSON payload
    let req;
    if (e.postData && e.postData.contents) {
      req = JSON.parse(e.postData.contents);
    } else {
      return respond({ status: "error", message: "Invalid request payload" });
    }

    const action = req.action;
    const data = req.data;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_TAB) || ss.getActiveSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    if (action === "add") {
      // Susun row baru berdasarkan urutan header
      const newRow = headers.map(h => {
        const key = String(h).trim().toLowerCase().replace(/\s+/g, "_");
        return data[key] !== undefined ? data[key] : "";
      });
      sheet.appendRow(newRow);
      return respond({ status: "ok", message: "Menu berhasil ditambahkan." });

    } else if (action === "edit") {
      const rowId = parseInt(req.id, 10);
      if (!rowId || rowId < 2) return respond({ status: "error", message: "Invalid ID (Row Index)." });

      // Update sel-sel di baris yang bersangkutan
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

// Helper: return JSON response with CORS headers
function respond(obj) {
  // Dalam Web App, jika set MIME type JSON, redirect Apps Script mungkin membatasi header khusus.
  // Tapi pendekatan ini sudah cukup untuk GET dan POST JSON jika di-fetch dari klien.
  let output = ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  return output;
}
