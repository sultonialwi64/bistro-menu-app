// ============================================================
//  BISTRO KEKINIAN — Menu API v3 (Secure CRUD)
//  Google Apps Script
// ============================================================

const SHEET_TAB = "Menu"; // Ganti jika nama tab sheet berbeda
const SHEET_ORDERS = "Pesanan"; // Tab untuk antrean pesanan
const ADMIN_PIN = "123456"; // PIN rahasia kamu, aman di server Google, tidak bisa di-inspect browser!

// Kredensial Midtrans Sandbox
const MIDTRANS_SERVER_KEY = "MASUKKAN_SERVER_KEY_ANDA_DI_SINI";
const MIDTRANS_CLIENT_KEY = "Mid-client-xPqUKBElwKUA7dwJ";
const MIDTRANS_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";

function pancingIzin() {
  UrlFetchApp.fetch("https://google.com");
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

    // ========================================================
    // MIDTRANS WEBHOOK HANDLER
    // ========================================================
    if (req.transaction_status && req.order_id) {
      const status = req.transaction_status;
      const orderId = req.order_id;
      
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let orderSheet = ss.getSheetByName(SHEET_ORDERS);
      if (orderSheet) {
        const raw = orderSheet.getDataRange().getValues();
        let newStatus = "";
        
        if (status === 'settlement' || status === 'capture') {
          newStatus = "Baru (Lunas)";
        } else if (status === 'cancel' || status === 'expire' || status === 'deny') {
          newStatus = "Batal";
        }
        
        if (newStatus !== "") {
          for (let i = 1; i < raw.length; i++) {
            if (raw[i][0] === orderId) {
              orderSheet.getRange(i + 1, 7).setValue(newStatus);
              break;
            }
          }
        }
      }
      return respond({ status: "ok", message: "Webhook processed" });
    }

    const action = req.action;
    const clientPin = req.pin;

    // ========================================================
    // AKSI PELANGGAN (PUBLIC) - TIDAK PERLU PIN
    // ========================================================
    if (action === "order") {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let orderSheet = ss.getSheetByName(SHEET_ORDERS);
      
      // Buat tab pesanan otomatis jika belum ada
      if (!orderSheet) {
        orderSheet = ss.insertSheet(SHEET_ORDERS);
        orderSheet.appendRow(["ID", "Waktu", "Nama", "Meja", "Total", "Detail", "Status"]);
        orderSheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#f0f0f0");
      }
      
      const data = req.data || {};

      if (action === "order") {
        const orderId = "ORD-" + Math.floor(10000 + Math.random() * 90000);
        const nama = data.nama || "Tanpa Nama";
        const meja = data.meja || "-";
        const totalStr = String(data.total || "0");
        let totalInt = data.totalInt ? data.totalInt : (parseInt(totalStr.replace(/[^0-9]/g, "")) || 0);
        const detail = data.detail || "";
        const waktu = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy, HH.mm.ss");
        
        let snapToken = "";
        
        // Jika pesanan tidak gratis (Rp 0), buat transaksi Midtrans
        if (totalInt > 0) {
          const payloadMidtrans = {
            transaction_details: {
              order_id: orderId,
              gross_amount: totalInt
            },
            customer_details: {
              first_name: nama
            }
          };
          
          const authHeader = "Basic " + Utilities.base64Encode(MIDTRANS_SERVER_KEY + ":");
          const options = {
            method: "post",
            contentType: "application/json",
            headers: { "Authorization": authHeader, "Accept": "application/json" },
            payload: JSON.stringify(payloadMidtrans),
            muteHttpExceptions: true
          };
          
          try {
            const resMidtrans = UrlFetchApp.fetch(MIDTRANS_URL, options);
            const midtransJson = JSON.parse(resMidtrans.getContentText());
            if (midtransJson.token) {
              snapToken = midtransJson.token;
            } else {
              return respond({ status: "error", message: "Midtrans API Error: " + resMidtrans.getContentText() });
            }
          } catch(err) {
            return respond({ status: "error", message: "Fetch Error: " + err.toString() });
          }
        }
        
        const status = snapToken ? "Menunggu Pembayaran" : "Baru";
        
        orderSheet.appendRow([orderId, waktu, nama, meja, totalStr, detail, status]);
        
        return respond({ status: "ok", message: "Pesanan berhasil dikirim!", orderId: orderId, token: snapToken, clientKey: MIDTRANS_CLIENT_KEY });
        
      } else if (action === "confirm_payment") {
        const orderId = data.orderId;
        if (!orderId) return respond({ status: "error", message: "Missing orderId" });
        
        // --- VERIFIKASI KEAMANAN (ANTI HACKER) ---
        // Kita tanya langsung ke server Midtrans apakah order ini BENAR-BENAR sudah dibayar!
        const authHeader = "Basic " + Utilities.base64Encode(MIDTRANS_SERVER_KEY + ":");
        const options = {
          method: "get",
          headers: { "Authorization": authHeader, "Accept": "application/json" },
          muteHttpExceptions: true
        };
        
        let isPaid = false;
        try {
          const res = UrlFetchApp.fetch("https://api.sandbox.midtrans.com/v2/" + orderId + "/status", options);
          const midtransJson = JSON.parse(res.getContentText());
          
          if (midtransJson.transaction_status === "settlement" || midtransJson.transaction_status === "capture") {
            isPaid = true;
          }
        } catch(e) {
          return respond({ status: "error", message: "Gagal verifikasi ke Midtrans" });
        }
        
        if (!isPaid) {
          return respond({ status: "error", message: "Pembayaran belum lunas atau tidak valid" });
        }
        // -----------------------------------------
        
        const orders = orderSheet.getDataRange().getValues();
        for (let i = 1; i < orders.length; i++) {
          if (orders[i][0] == orderId) {
            orderSheet.getRange(i + 1, 7).setValue("Lunas");
            return respond({ status: "ok", message: "Pembayaran valid dan dikonfirmasi" });
          }
        }
        return respond({ status: "error", message: "Order not found" });
      }
    }

    // ========================================================
    // AKSI ADMIN (PRIVATE) - WAJIB PIN
    // ========================================================
    // Verifikasi PIN terlebih dahulu untuk SEMUA aksi Admin
    if (!clientPin || clientPin !== ADMIN_PIN) {
      return respond({ status: "error", message: "Akses ditolak: PIN tidak valid atau salah!" });
    }

    // Jika aksinya hanya cek login PIN
    if (action === "login") {
      return respond({ status: "ok", message: "PIN valid" });
    }
    
    // Fitur: Ambil Semua Pesanan
    if (action === "getOrders") {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let orderSheet = ss.getSheetByName(SHEET_ORDERS);
      if (!orderSheet) return respond({ status: "ok", total: 0, data: [] });
      
      const raw = orderSheet.getDataRange().getValues();
      if (raw.length < 2) return respond({ status: "ok", total: 0, data: [] });
      
      const orders = [];
      for (let i = 1; i < raw.length; i++) {
        const row = raw[i];
        if (row[0]) {
          orders.push({
            rowIdx: i + 1,
            id: row[0],
            waktu: row[1],
            nama: row[2],
            meja: row[3],
            total: row[4],
            detail: row[5],
            status: row[6]
          });
        }
      }
      // Membalik array agar pesanan terbaru ada di atas (opsional, tapi bagus untuk dashboard)
      orders.reverse();
      return respond({ status: "ok", total: orders.length, data: orders });
    }
    
    // Fitur: Update Status Pesanan (misal "Selesai")
    if (action === "updateOrderStatus") {
      const rowId = parseInt(req.rowIdx, 10);
      const newStatus = req.status;
      if (!rowId || rowId < 2 || !newStatus) return respond({ status: "error", message: "Invalid parameter." });
      
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let orderSheet = ss.getSheetByName(SHEET_ORDERS);
      if (orderSheet) {
        orderSheet.getRange(rowId, 7).setValue(newStatus);
      }
      return respond({ status: "ok", message: "Status pesanan diperbarui." });
    }

    // Fitur: Kelola Data Menu (CRUD Lama)
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
    .setMimeType(ContentService.MimeType.JSON);
}
