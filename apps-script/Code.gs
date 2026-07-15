// ============================================================
//  BISTRO KEKINIAN — Menu API v3 (Secure CRUD)
//  Google Apps Script
// ============================================================

const SHEET_TAB = "Menu"; // Ganti jika nama tab sheet berbeda
const SHEET_ORDERS = "Pesanan"; // Tab untuk antrean pesanan
const ADMIN_PIN = "123456"; // PIN rahasia kamu, aman di server Google, tidak bisa di-inspect browser!

// Kredensial Midtrans PRODUCTION
const MIDTRANS_SERVER_KEY = "MASUKKAN_SERVER_KEY_PRODUCTION_ANDA_DI_SINI";
const MIDTRANS_CLIENT_KEY = "MASUKKAN_CLIENT_KEY_PRODUCTION_ANDA_DI_SINI";
const MIDTRANS_URL = "https://app.midtrans.com/snap/v1/transactions";

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
          
          let initialStatus = "Menunggu Pembayaran";
          orderSheet.appendRow([orderId, waktu, nama, meja, totalStr, detail, initialStatus]);
          return respond({ status: "ok", message: "Silakan bayar", orderId: orderId, token: snapToken, clientKey: MIDTRANS_CLIENT_KEY });
        }
        
        // Jika bayar tunai (Rp 0), simpan langsung
        orderSheet.appendRow([orderId, waktu, nama, meja, totalStr, detail, "Baru"]);
        return respond({ status: "ok", message: "Pesanan berhasil dikirim!", orderId: orderId, token: null });
        
      } else if (action === "confirm_payment") {
        const orderId = data.orderId;
        if (!orderId) return respond({ status: "error", message: "Missing orderId" });
        
        // --- VERIFIKASI KEAMANAN (ANTI HACKER) ---
        const authHeader = "Basic " + Utilities.base64Encode(MIDTRANS_SERVER_KEY + ":");
        const options = {
          method: "get",
          headers: { "Authorization": authHeader, "Accept": "application/json" },
          muteHttpExceptions: true
        };
        
        let isPaid = false;
        try {
          const res = UrlFetchApp.fetch("https://api.midtrans.com/v2/" + orderId + "/status", options);
          const midtransJson = JSON.parse(res.getContentText());
          
          if (midtransJson.transaction_status === "settlement" || midtransJson.transaction_status === "capture") {
            isPaid = true;
          }
        } catch(e) {
          return respond({ status: "error", message: "Gagal verifikasi ke Midtrans" });
        }
        
        if (!isPaid) {
          if (midtransJson.transaction_status === "expire" || midtransJson.transaction_status === "cancel") {
            const raw = orderSheet.getDataRange().getValues();
            for (let i = 1; i < raw.length; i++) {
              if (raw[i][0] === orderId) {
                orderSheet.getRange(i + 1, 7).setValue("Batal");
                break;
              }
            }
          }
          return respond({ status: "error", message: "Pembayaran belum lunas atau tidak valid" });
        }
        
        // SIMPAN KE GOOGLE SHEET SEKARANG KARENA SUDAH LUNAS
        const raw = orderSheet.getDataRange().getValues();
        for (let i = 1; i < raw.length; i++) {
          if (raw[i][0] === orderId) {
            orderSheet.getRange(i + 1, 7).setValue("Lunas");
            return respond({ status: "ok", message: "Pembayaran valid dan pesanan diperbarui" });
          }
        }
        
        return respond({ status: "error", message: "Pesanan tidak ditemukan" });
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

// ========================================================
// FUNGSI UNTUK MENGISI MENU DUMMY SECARA OTOMATIS
// ========================================================
function isikanDummyMenu() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TAB) || ss.getActiveSheet();
  
  // Hapus semua data yang ada (kecuali baris 1 jika itu header, tapi kita buat ulang saja)
  sheet.clear();
  
  // Buat Header
  sheet.appendRow(["name", "desc", "price", "category", "tags", "image", "stars", "ribbon"]);
  
  // Data Dummy Komplit
  const dummyData = [
    ["Truffle Wagyu Steak", "Daging wagyu A5 panggang dengan saus truffle mushroom, disajikan bersama mashed potato lembut.", "250000", "main course", "Chef's Recommendation, Halal", "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=500&q=80", "5", "Best Seller"],
    ["Salmon En Croute", "Salmon Norwegia segar yang dibalut puff pastry renyah dengan isian bayam krim dan keju parmesan.", "145000", "main course", "Seafood, Premium", "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&q=80", "4.8", "New"],
    ["Nasi Goreng Kampung Sultan", "Nasi goreng bumbu rempah nusantara dengan sate lilit ayam, telur mata sapi, dan kerupuk udang.", "65000", "main course", "Lokal, Pedas", "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80", "4.7", ""],
    ["Chicken Parmigiana", "Dada ayam berlapis tepung panir, digoreng renyah, disiram saus tomat basil dan keju mozzarella leleh.", "85000", "main course", "Western, Ayam", "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=500&q=80", "4.5", ""],
    
    ["Calamari Rings", "Cumi goreng tepung renyah dengan saus tartar spesial Bistro Kekinian.", "45000", "appetizer", "Seafood, Snack", "https://images.unsplash.com/photo-1599487405270-bc071516d87a?w=500&q=80", "4.6", ""],
    ["Truffle French Fries", "Kentang goreng renyah yang ditaburi truffle oil dan keju parmesan segar.", "40000", "appetizer", "Snack, Vegetarian", "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&q=80", "4.9", "Must Try"],
    ["Caesar Salad", "Selada romaine segar dengan saus caesar buatan sendiri, crouton, dan irisan dada ayam panggang.", "55000", "appetizer", "Healthy, Ayam", "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=500&q=80", "4.5", ""],
    
    ["Classic Tiramisu", "Kue bolu lapis espresso dengan krim mascarpone Italia autentik dan taburan bubuk kakao.", "50000", "dessert", "Sweet, Kopi", "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=500&q=80", "4.8", "Recommended"],
    ["Lava Cake Chocolate", "Kue cokelat hangat dengan isian cokelat lumer di dalam, disajikan dengan es krim vanilla.", "45000", "dessert", "Sweet, Cokelat", "https://images.unsplash.com/photo-1611003444855-667954d24669?w=500&q=80", "4.9", ""],
    ["Panna Cotta Berries", "Puding krim Italia klasik yang lembut dengan saus mix berries yang segar.", "40000", "dessert", "Sweet, Fruity", "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&q=80", "4.6", ""],
    
    ["Signature Iced Coffee", "Es kopi susu kekinian dengan gula aren asli dan krimer premium yang creamy.", "35000", "beverage", "Cold, Kopi", "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba1?w=500&q=80", "4.7", "Bistro Pick"],
    ["Strawberry Mojito", "Minuman soda menyegarkan dengan daun mint, jeruk nipis, dan potongan buah stroberi segar.", "38000", "beverage", "Cold, Segar", "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80", "4.5", ""],
    ["Matcha Latte", "Minuman green tea premium dari Jepang yang disajikan hangat dengan susu segar.", "40000", "beverage", "Hot, Teh", "https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=500&q=80", "4.6", ""],
    ["Earl Grey Tea", "Teh Earl Grey premium khas Inggris yang disajikan dalam teko kaca elegan.", "30000", "beverage", "Hot, Teh", "https://images.unsplash.com/photo-1594631252845-29fc4cc8c0a1?w=500&q=80", "4.4", ""]
  ];
  
  // Masukkan data ke sheet
  dummyData.forEach(row => {
    sheet.appendRow(row);
  });
  
  // Rapikan sheet sedikit
  sheet.getRange("A1:H1").setFontWeight("bold");
  sheet.setFrozenRows(1);
  
  return "Data Dummy berhasil ditambahkan ke tab " + sheet.getName();
}
