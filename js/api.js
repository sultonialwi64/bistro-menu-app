// js/api.js
import { APPS_SCRIPT_URL } from "./config.js";

/**
 * Fetches menu data from the backend.
 * @returns {Promise<Array>} Array of menu items
 */
export async function fetchMenuData() {
  const response = await fetch(APPS_SCRIPT_URL);
  const json = await response.json();
  if (json.status === "ok") {
    return json.data;
  } else {
    throw new Error(json.message || "Failed to fetch menu");
  }
}

/**
 * Submits an order to the backend.
 * @param {Object} orderData 
 * @returns {Promise<Object>} Response object
 */
export async function submitOrder(orderData) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(orderData)
  });
  const json = await response.json();
  if (json.status === "ok") {
    return json;
  } else {
    throw new Error(json.message || "Order submission failed");
  }
}

/**
 * Admin: Verify PIN and Login
 * @param {string} pin 
 * @returns {Promise<boolean>}
 */
export async function adminLogin(pin) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "login", pin: pin })
  });
  const json = await response.json();
  if (json.status === "ok") {
    return true;
  } else {
    throw new Error(json.message || "PIN salah.");
  }
}

/**
 * Admin: Get active and completed orders
 * @param {string} pin 
 * @returns {Promise<Array>} Array of orders
 */
export async function adminGetOrders(pin) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "getOrders", pin: pin })
  });
  const json = await response.json();
  if (json.status === "ok") {
    return json.data;
  } else {
    throw new Error(json.message || "Gagal mengambil pesanan");
  }
}

/**
 * Admin: Update order status
 * @param {string} pin 
 * @param {number} rowIdx 
 * @param {string} status 
 * @returns {Promise<Object>}
 */
export async function adminUpdateOrderStatus(pin, rowIdx, status) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "updateOrderStatus", pin: pin, rowIdx: rowIdx, status: status })
  });
  const json = await response.json();
  if (json.status === "ok") {
    return json;
  } else {
    throw new Error(json.message || "Gagal update status");
  }
}

/**
 * Admin: Save or update menu
 * @param {Object} payload 
 * @returns {Promise<Object>}
 */
export async function adminSaveMenu(payload) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  if (json.status === "ok") {
    return json;
  } else {
    throw new Error(json.message || "Gagal menyimpan menu");
  }
}

/**
 * Admin: Delete menu
 * @param {number} id 
 * @param {string} pin 
 * @returns {Promise<Object>}
 */
export async function adminDeleteMenu(id, pin) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "delete", id: id, pin: pin })
  });
  const json = await response.json();
  if (json.status === "ok") {
    return json;
  } else {
    throw new Error(json.message || "Gagal menghapus menu");
  }
}
