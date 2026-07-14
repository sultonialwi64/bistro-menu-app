// js/utils.js

export function parsePrice(priceStr) {
  if (!priceStr) return 0;
  return parseInt(priceStr.replace(/[^0-9]/g, "")) || 0;
}

export function formatRupiah(number) {
  return "Rp " + number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function showToast(msg, duration = 3000) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.style.position = "fixed";
    toast.style.bottom = "-60px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = "var(--ink-mid)";
    toast.style.border = "1px solid var(--border)";
    toast.style.color = "var(--cream)";
    toast.style.padding = "12px 28px";
    toast.style.borderRadius = "50px";
    toast.style.fontSize = "0.88rem";
    toast.style.fontWeight = "600";
    toast.style.transition = "bottom 0.3s cubic-bezier(0.25,1,0.5,1)";
    toast.style.zIndex = "10000";
    toast.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
    toast.style.whiteSpace = "nowrap";
    document.body.appendChild(toast);
    
    // Add specific styles if it's admin page
    if (document.querySelector('.app-shell')) {
       toast.style.background = "var(--surface2)";
       toast.style.color = "var(--text)";
    }
  }
  toast.innerText = msg;
  toast.classList.add("show");
  // using inline style for bottom since it's hardcoded here
  toast.style.bottom = "28px"; 
  setTimeout(() => {
    toast.style.bottom = "-60px";
    toast.classList.remove("show");
  }, duration);
}
