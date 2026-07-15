// js/admin.js
import { adminLogin, adminGetOrders, adminUpdateOrderStatus, adminSaveMenu, adminDeleteMenu, fetchMenuData } from "./api.js";
import { showToast } from "./utils.js";
import { APPS_SCRIPT_URL } from "./config.js";

let sessionPin = "";
let cachedData = [];
let isSaving = false;
let fetchInterval = null;
let knownOrderIds = new Set();
let alarmInterval = null;
let audioCtx = null;
let lastOrders = [];

// Expose functions to window for HTML inline event handlers
window.openSidebar = function() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sidebarOverlay").classList.add("show");
};

window.closeSidebar = function() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("show");
};

window.checkPin = async function() {
  const pinInput = document.getElementById("pinInput");
  const val = pinInput.value.trim();
  if (!val) return;
  const btn = document.querySelector("#pinOverlay button");
  btn.innerText = "Memverifikasi...";
  btn.disabled = true;
  try {
    await adminLogin(val);
    sessionPin = val;
    document.getElementById("pinOverlay").style.display = "none";
    window.fetchData();
    window.switchTab("orders");
  } catch (err) {
    const e = document.getElementById("pinError");
    e.innerText = err.message || "PIN salah.";
    e.style.display = "block";
    pinInput.value = "";
    pinInput.focus();
  } finally {
    btn.innerText = "Masuk \u2192";
    btn.disabled = false;
  }
};

window.fetchData = async function() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = `<tr><td colspan="5" class="loading-state"><div class="loading-spinner"></div><br>Mengambil data...</td></tr>`;
  try {
    cachedData = await fetchMenuData();
    renderTable(cachedData);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-state" style="color:#ff6b6b;">\u26A0\uFE0F Gagal: ${err.message}</td></tr>`;
  }
};

function renderTable(data) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-state">Menu kosong.</td></tr>`;
    return;
  }
  data.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="td-img"><img src="${item.image || item.img || 'https://via.placeholder.com/50'}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/50'"></td>
    <td><div class="td-name">${item.name}</div><div class="td-price">${item.price}</div></td>
    <td><span class="td-cat">${item.category}</span></td>
    <td class="td-desc" title="${item.desc}">${item.desc}</td>
    <td style="text-align:right;white-space:nowrap;">
      <button class="btn-edit-sm" onclick="openModal('edit', ${item.id})">\u270F Edit</button>
      <button class="btn-danger-sm" onclick="deleteMenu(${item.id}, '${item.name.replace(/'/g, '')}')">\u00D7 Hapus</button>
    </td>`;
    tbody.appendChild(tr);
  });
}

window.openModal = function(mode, id = null) {
  const form = document.getElementById("menuForm");
  form.reset();
  document.getElementById("formId").value = "";
  document.getElementById("modalTitle").innerText = mode === "add" ? "Tambah Menu Baru" : "Edit Menu";
  if (mode === "edit" && id) {
    const item = cachedData.find((d) => d.id === id);
    if (item) {
      document.getElementById("formId").value = item.id;
      document.getElementById("formName").value = item.name;
      document.getElementById("formPrice").value = item.price;
      document.getElementById("formCategory").value = (item.category || "main").toLowerCase();
      document.getElementById("formStars").value = item.stars || "5";
      document.getElementById("formImage").value = item.image || item.img;
      document.getElementById("formDesc").value = item.desc;
      document.getElementById("formTags").value = item.tags;
      document.getElementById("formRibbon").value = item.ribbon;
    }
  }
  document.getElementById("formModal").classList.add("active");
};

window.closeModal = function() {
  document.getElementById("formModal").classList.remove("active");
};

window.saveMenu = async function() {
  if (isSaving) return;
  const form = document.getElementById("menuForm");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const rowId = document.getElementById("formId").value;
  const payload = {
    action: rowId ? "edit" : "add",
    id: rowId || null,
    pin: sessionPin,
    data: {
      name: document.getElementById("formName").value,
      price: document.getElementById("formPrice").value,
      category: document.getElementById("formCategory").value,
      stars: document.getElementById("formStars").value,
      image: document.getElementById("formImage").value,
      desc: document.getElementById("formDesc").value,
      tags: document.getElementById("formTags").value,
      ribbon: document.getElementById("formRibbon").value
    }
  };
  
  const btnSave = document.getElementById("btnSave");
  btnSave.innerText = "Menyimpan...";
  isSaving = true;
  try {
    await adminSaveMenu(payload);
    showToast(rowId ? "\u2713 Perubahan disimpan!" : "\u2713 Menu baru ditambahkan!");
    window.closeModal();
    window.fetchData();
  } catch (err) {
    showToast("Kesalahan jaringan: " + err.message);
  } finally {
    btnSave.innerText = "Simpan Menu";
    isSaving = false;
  }
};

window.deleteMenu = async function(id, name) {
  const modal = document.getElementById("confirmModal");
  document.getElementById("confirmTitle").innerText = "Hapus Menu?";
  document.getElementById("confirmMessage").innerText = `Yakin ingin menghapus "${name}"?`;
  
  const btnOk = document.getElementById("btnConfirmOk");
  btnOk.innerText = "Hapus";
  btnOk.style.background = "var(--accent)";
  
  modal.classList.add("active");
  
  document.getElementById("btnConfirmCancel").onclick = function() {
    modal.classList.remove("active");
  };
  
  btnOk.onclick = async function() {
    modal.classList.remove("active");
    try {
      await adminDeleteMenu(id, sessionPin);
      showToast("✔ Menu dihapus!");
      window.fetchData();
    } catch (err) {
      showToast("Kesalahan jaringan: " + err.message);
    }
  };
};

window.switchTab = function(tab) {
  document.getElementById("tabMenu").classList.toggle("active", tab === "menu");
  document.getElementById("tabOrders").classList.toggle("active", tab === "orders");
  document.getElementById("tabHistory").classList.toggle("active", tab === "history");
  
  document.getElementById("tabBtnMenu").classList.toggle("active", tab === "menu");
  document.getElementById("tabBtnOrders").classList.toggle("active", tab === "orders");
  document.getElementById("tabBtnHistory").classList.toggle("active", tab === "history");
  
  const titles = {
    orders: ["Pesanan Masuk", "Memantau pesanan secara real-time"],
    menu: ["Kelola Menu", "Tambah, edit, atau hapus item menu"],
    history: ["Riwayat Pesanan", "Daftar pesanan yang telah selesai atau dibatalkan"]
  };
  
  document.getElementById("topbarTitle").innerText = titles[tab][0];
  document.getElementById("topbarSub").innerText = titles[tab][1];
  window.closeSidebar();
  
  if (tab === "orders" || tab === "history") {
    if (lastOrders.length > 0) renderOrders(lastOrders);
    window.fetchOrders();
    if (!fetchInterval) fetchInterval = setInterval(window.fetchOrders, 3000);
  } else {
    if (fetchInterval) {
      clearInterval(fetchInterval);
      fetchInterval = null;
    }
  }
};

function startAlarm() {
  const st = document.getElementById("soundToggle");
  if (st && !st.checked) return;
  if (alarmInterval) return;
  
  document.getElementById("stopAlarmBtn").style.display = "flex";
  alarmInterval = setInterval(() => {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.type = "square";
      o.frequency.setValueAtTime(400, audioCtx.currentTime);
      o.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.3);
      g.gain.setValueAtTime(0.5, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      o.start();
      o.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio failed", e);
    }
    if ("vibrate" in navigator) navigator.vibrate([300, 100, 300]);
  }, 1000);
}

window.stopAlarm = function() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  if ("vibrate" in navigator) navigator.vibrate(0);
  document.getElementById("stopAlarmBtn").style.display = "none";
};

window.fetchOrders = async function() {
  if (!sessionPin) return;
  try {
    const orders = await adminGetOrders(sessionPin);
    lastOrders = orders;
    renderOrders(orders);
    // Auto-check any "Menunggu Pembayaran" orders silently
    const pendingOrders = orders.filter(o => o.status === "Menunggu Pembayaran");
    if (pendingOrders.length > 0) {
      pendingOrders.forEach(async (po) => {
        try {
          await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "confirm_payment", data: { orderId: po.id } })
          });
        } catch(e) { } // silent ignore
      });
    }
  } catch (err) {
    console.error("Gagal mengambil pesanan", err);
    if (lastOrders.length === 0) {
      const historyBody = document.getElementById("historyTableBody");
      if (historyBody) historyBody.innerHTML = `<tr><td colspan="6" class="loading-state" style="color:var(--red)">Gagal mengambil riwayat. Periksa koneksi internet Anda.</td></tr>`;
      
      const grid = document.getElementById("ordersGrid");
      if (grid) grid.innerHTML = `<div class="empty-state"><h3>Gagal mengambil data</h3><p>Koneksi terputus. Sistem akan otomatis mencoba lagi.</p></div>`;
    }
  }
};

function renderOrders(data) {
  const grid = document.getElementById("ordersGrid");
  const badge = document.getElementById("orderBadge");
  
  const activeOrders = data.filter((o) => o.status !== "Selesai" && o.status !== "Batal");
  const doneOrders = data.filter((o) => o.status === "Selesai" || o.status === "Batal");
  
  document.getElementById("statActive").innerText = activeOrders.length;
  document.getElementById("statTotal").innerText = data.length;
  document.getElementById("statDone").innerText = doneOrders.length;
  document.getElementById("statLast").innerText = data.length > 0 ? data[0].id : "\u2014";
  
  grid.innerHTML = "";
  if (activeOrders.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">\uD83C\uDF89</div><h3>Semua pesanan selesai!</h3><p>Tidak ada antrian aktif saat ini.</p></div>`;
    badge.style.display = "none";
  } else {
    badge.style.display = "inline-block";
    badge.innerText = activeOrders.length;
    let hasNew = false;
    
    activeOrders.forEach((order) => {
      if (!knownOrderIds.has(order.id)) {
        hasNew = true;
        knownOrderIds.add(order.id);
      }
      const mejaLabel = String(order.meja).toLowerCase().includes("meja") ? order.meja : "Meja " + order.meja;
      const card = document.createElement("div");
      card.className = "order-card" + (order.status === "Baru" ? " new" : "");
      let statusBadge = "";
      if (order.status === "Menunggu Pembayaran") {
        statusBadge = `<span style="background:#f39c12;color:#fff;padding:2px 8px;border-radius:12px;font-size:0.75rem;margin-left:8px;">Menunggu Pembayaran (Midtrans)</span>`;
      } else if (order.status === "Lunas") {
        statusBadge = `<span style="background:var(--green);color:#fff;padding:2px 8px;border-radius:12px;font-size:0.75rem;margin-left:8px;">Sudah Dibayar (Midtrans)</span>`;
      } else if (order.status === "Baru") {
         statusBadge = `<span style="background:var(--accent);color:#fff;padding:2px 8px;border-radius:12px;font-size:0.75rem;margin-left:8px;">Bayar di Kasir</span>`;
      } else {
        statusBadge = `<span style="background:#555;color:#fff;padding:2px 8px;border-radius:12px;font-size:0.75rem;margin-left:8px;">${order.status}</span>`;
      }

      card.innerHTML = `<div class="order-header"><span class="order-id">${order.id}${statusBadge}</span><span class="order-time">${order.waktu}</span></div>
      <div class="order-meta"><div class="order-name">👤 ${order.nama}</div><div class="order-table">📍 ${mejaLabel}</div></div>
      <div class="order-detail">${order.detail}</div>
      <div class="order-footer"><span class="order-total">${order.total}</span>
        <button class="btn btn-success" onclick="updateOrderStatus(${order.rowIdx}, 'Selesai')" style="padding:8px 18px;font-size:0.85rem;">✔ Selesai</button>
      </div>`;
      grid.appendChild(card);
    });
    
    if (hasNew) startAlarm();
  }
  
  const tbody = document.getElementById("historyTableBody");
  if(tbody) {
    tbody.innerHTML = "";
    if (doneOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="loading-state">Belum ada riwayat pesanan.</td></tr>`;
    } else {
      doneOrders.forEach((order) => {
        const tr = document.createElement("tr");
        let statusBadge = order.status === "Selesai" 
            ? `<span style="padding:4px 8px;border-radius:4px;background:var(--green);color:#fff;font-size:0.8rem;font-weight:600;">Selesai</span>`
            : `<span style="padding:4px 8px;border-radius:4px;background:#e74c3c;color:#fff;font-size:0.8rem;font-weight:600;">Batal</span>`;
        tr.innerHTML = `
          <td><strong>${order.id}</strong></td>
          <td style="color:var(--muted);font-size:0.9rem;">${order.waktu}</td>
          <td>
            <div style="font-weight:600;">${order.nama}</div>
            <div style="font-size:0.85rem;color:var(--muted);">Meja: ${order.meja}</div>
          </td>
          <td style="font-size:0.9rem;white-space:pre-wrap;max-width:250px;">${order.detail}</td>
          <td style="font-weight:700;color:var(--accent);">${order.total}</td>
          <td>${statusBadge}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }
}

window.updateOrderStatus = async function(rowIdx, newStatus) {
  const modal = document.getElementById("confirmModal");
  document.getElementById("confirmTitle").innerText = "Tandai Selesai?";
  document.getElementById("confirmMessage").innerText = `Tandai pesanan ini sebagai ${newStatus}?`;
  
  const btnOk = document.getElementById("btnConfirmOk");
  btnOk.innerText = "Selesai";
  btnOk.style.background = "var(--green)";
  
  modal.classList.add("active");
  
  document.getElementById("btnConfirmCancel").onclick = function() {
    modal.classList.remove("active");
  };
  
  btnOk.onclick = async function() {
    modal.classList.remove("active");
    try {
      await adminUpdateOrderStatus(sessionPin, rowIdx, newStatus);
      showToast("✔ Pesanan ditandai " + newStatus);
      window.fetchOrders();
    } catch (err) {
      showToast("Gagal update status");
    }
  };
};

// Listen to Pin Input Enter
document.addEventListener("DOMContentLoaded", () => {
    const pinInput = document.getElementById("pinInput");
    if(pinInput) {
        pinInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") window.checkPin();
        });
    }
});
