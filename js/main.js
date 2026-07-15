import { APPS_SCRIPT_URL } from './config.js';
import { parsePrice, formatRupiah, showToast } from './utils.js';

/* ================================================================
   🔧  KONFIGURASI  — Edit bagian ini setelah setup Apps Script
   ================================================================
   1. Ikuti PANDUAN_SETUP.md untuk mendapatkan URL Apps Script
   2. Paste URL tersebut di bawah ini (ganti teks PASTE_URL_DISINI)
   ================================================================ */
      
      // Contoh URL asli:
      // const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwXXXXXXXX/exec';
      /* ================================================================ */

      /* ── DATA CADANGAN (dipakai jika Sheets gagal dimuat) ──────────── */
      const FALLBACK_DATA = [
        {
          name: "Burger Wagyu",
          price: "Rp 89.000",
          category: "main",
          stars: "5",
          image:
            "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80",
          desc: "Daging wagyu grade A dengan lelehan keju gruyère, karamelisasi bawang, dan truffle aioli dalam roti brioche panggang.",
          tags: "Wagyu,Premium,Signature",
          ribbon: "Signature",
        },
        {
          name: "Steak Ribeye",
          price: "Rp 145.000",
          category: "main",
          stars: "5",
          image:
            "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80",
          desc: "Ribeye 250g dimasak medium rare dengan saus red wine reduction, roasted potato wedges, dan asparagus panggang.",
          tags: "Beef,Premium,Best Seller",
          ribbon: "Best Seller",
        },
        {
          name: "Pasta Carbonara",
          price: "Rp 75.000",
          category: "main",
          stars: "4",
          image:
            "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80",
          desc: "Spaghetti al dente dengan saus carbonara creamy autentik, pancetta crispy, kuning telur organik, dan parmesan aged.",
          tags: "Italian,Creamy,Chef's Pick",
          ribbon: "",
        },
        {
          name: "Nasi Goreng Royal",
          price: "Rp 58.000",
          category: "main",
          stars: "5",
          image:
            "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80",
          desc: "Nasi goreng dengan udang jumbo, telur mata sapi, abon sapi premium, dan sambal bajak terasi yang harum menggugah selera.",
          tags: "Indonesian,Spicy,Favorite",
          ribbon: "",
        },
        {
          name: "Caesar Salad",
          price: "Rp 48.000",
          category: "appetizer",
          stars: "4",
          image:
            "https://images.unsplash.com/photo-1512852939750-1305098529bf?w=500&q=80",
          desc: "Romaine lettuce segar dengan dressing caesar homemade, crouton renyah, parmesan shaving, dan anchovy pilihan.",
          tags: "Organic,Fresh,Light",
          ribbon: "",
        },
        {
          name: "Sup Krim Truffle",
          price: "Rp 42.000",
          category: "appetizer",
          stars: "5",
          image:
            "https://images.unsplash.com/photo-1547592180-85f173990554?w=500&q=80",
          desc: "Sup krim jamur porcini dengan sentuhan minyak truffle hitam, crème fraîche, dan taburan chive segar yang harum.",
          tags: "Truffle,Creamy,Premium",
          ribbon: "Signature",
        },
        {
          name: "Lava Cake Coklat",
          price: "Rp 52.000",
          category: "dessert",
          stars: "5",
          image:
            "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=500&q=80",
          desc: "Molten chocolate lava cake dengan isian ganache Valrhona 70% yang meleleh, disajikan dengan vanilla bean ice cream.",
          tags: "Chocolate,Warm,Indulgent",
          ribbon: "Best Seller",
        },
        {
          name: "Es Krim Artisan",
          price: "Rp 38.000",
          category: "dessert",
          stars: "4",
          image:
            "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=500&q=80",
          desc: "Tiga scoop es krim buatan sendiri: vanilla Madagascar, coklat Belgia, dan pistachio Sicily — dengan wafer cone artisan.",
          tags: "Handcrafted,Cold,Creamy",
          ribbon: "",
        },
      ];

      /* ── Peta nama kategori ─────────────────────────────────────────── */
      const CAT_LABELS = {
        main: "Main Course",
        appetizer: "Appetizer",
        dessert: "Dessert",
      };
      const FALLBACK_IMG =
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80";

      /* ── Global data store ─────────────────────────────────────────── */
      window.MENU_DATA = [];

      /* ================================================================
   INIT
   ================================================================ */
      gsap.registerPlugin(ScrollTrigger);

      /* Cursor glow */
      const cGlow = document.getElementById("cGlow");
      document.addEventListener("mousemove", (e) => {
        gsap.to(cGlow, {
          left: e.clientX,
          top: e.clientY,
          duration: 0.18,
          ease: "none",
        });
      });

      /* Particles */
      particlesJS("particles-js", {
        particles: {
          number: { value: 38, density: { enable: true, value_area: 900 } },
          color: { value: ["#c8880e", "#c0392b", "#e8a020"] },
          shape: { type: "circle" },
          opacity: {
            value: 0.22,
            random: true,
            anim: { enable: true, speed: 0.4, opacity_min: 0.04, sync: false },
          },
          size: { value: 2.4, random: true },
          line_linked: { enable: false },
          move: {
            enable: true,
            speed: 0.42,
            direction: "none",
            random: true,
            out_mode: "out",
          },
        },
        interactivity: {
          detect_on: "canvas",
          events: {
            onhover: { enable: true, mode: "bubble" },
            onclick: { enable: false },
            resize: true,
          },
          modes: {
            bubble: { distance: 110, size: 5, duration: 2, opacity: 0.55 },
          },
        },
        retina_detect: true,
      });

      /* ================================================================
   LOADER  →  fetch data  →  entrance animation
   ================================================================ */
      window.addEventListener("load", () => {
        setTimeout(() => {
          gsap.to("#loader", {
            opacity: 0,
            duration: 0.55,
            ease: "power2.inOut",
            onComplete: async () => {
              document.getElementById("loader").style.display = "none";
              runHeaderEntrance();
              await loadMenuData(); // fetch dari Sheets
              runCardEntrance();
            },
          });
        }, 600);
      });

      /* ── Header animation (tidak bergantung data) ───────────────────── */
      function runHeaderEntrance() {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.to("#hdBadge", { opacity: 1, duration: 0.45 }, 0.05);
        tl.fromTo(
          "#hdTitle",
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.6 },
          0.18,
        );
        tl.to(
          ["#hdOrn", "#hdSub"],
          { opacity: 1, duration: 0.45, stagger: 0.1 },
          0.58,
        );
        tl.to("#catStrip", { opacity: 1, duration: 0.4 }, 0.72);
        tl.to(".sec-label", { opacity: 1, duration: 0.4, stagger: 0.12 }, 0.75);
      }

      /* ── Fetch dari Google Sheets via Apps Script ───────────────────── */
      async function loadMenuData() {
        /* Jika URL belum dikonfigurasi, pakai data cadangan */
        if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "PASTE_URL_DISINI") {
          console.info("[Menu] URL belum dikonfigurasi → pakai data cadangan.");
          renderCards(FALLBACK_DATA);
          return;
        }

        try {
          const res = await fetch(APPS_SCRIPT_URL, { cache: "no-cache" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();

          if (
            json.status === "ok" &&
            Array.isArray(json.data) &&
            json.data.length > 0
          ) {
            console.info(
              `[Menu] ${json.total} item dimuat dari Google Sheets.`,
            );
            renderCards(json.data);
          } else {
            throw new Error(json.message || "Data kosong dari Sheets");
          }
        } catch (err) {
          console.warn(
            "[Menu] Gagal dari Sheets:",
            err.message,
            "→ pakai data cadangan.",
          );
          document.getElementById("fetchError").style.display = "block";
          renderCards(FALLBACK_DATA);
        }
      }

      /* ── Render cards dinamis ──────────────────────────────────────── */
      function renderCards(data) {
        window.MENU_DATA = data;

        const grids = {
          main: document.getElementById("gridMain"),
          appetizer: document.getElementById("gridAppetizer"),
          dessert: document.getElementById("gridDessert"),
        };

        /* Kosongkan skeleton */
        Object.values(grids).forEach((g) => {
          if (g) g.innerHTML = "";
        });

        /* Isi grid sesuai kategori */
        data.forEach((item, idx) => {
          const cat = (item.category || "main").toLowerCase().trim();
          const grid = grids[cat] || grids["main"];
          if (grid) grid.insertAdjacentHTML("beforeend", buildCard(item, idx));
        });

        /* Sembunyikan grup yang kosong */
        Object.keys(grids).forEach((cat) => {
          const group = document.getElementById(
            "group" + cat.charAt(0).toUpperCase() + cat.slice(1),
          );
          const grid = grids[cat];
          if (group && grid) {
            group.style.display = grid.children.length === 0 ? "none" : "";
          }
        });
        updateCardControls();
      }

      /* ── Buat HTML satu card ───────────────────────────────────────── */
      function buildCard(item, idx) {
        const cat = (item.category || "main").toLowerCase().trim();
        const catLabel = CAT_LABELS[cat] || "Menu";
        const ribbon = item.ribbon
          ? `<span class="card-ribbon">${item.ribbon}</span>`
          : "";
        const img = item.image || item.img || FALLBACK_IMG;
        const displayPrice = formatRupiah(parsePrice(item.price));

        return `
      <div class="menu-card" data-category="${cat}" data-idx="${idx}" onclick="openModal(this)">
        <div class="card-photo">
          <img src="${img}" alt="${item.name}" class="menu-img" loading="lazy"
               onerror="this.src='${FALLBACK_IMG}'">
          <span class="card-badge">${catLabel}</span>
          ${ribbon}
        </div>
        <div class="card-body">
          <div class="card-name">${item.name}</div>
          <div class="card-row" style="justify-content: space-between; align-items: center;">
            <div class="card-price">${displayPrice}</div>
            <div class="card-cart-ctrl" data-idx="${idx}" onclick="event.stopPropagation();">
              <!-- JS will dynamically populate add/minus controls here -->
            </div>
          </div>
        </div>
      </div>`;
      }

      /* ── Card entrance setelah render ──────────────────────────────── */
      function runCardEntrance() {
        gsap.set(".menu-card", { opacity: 0, y: 26 });
        gsap.to(".menu-card", {
          opacity: 1,
          y: 0,
          duration: 0.58,
          stagger: { amount: 0.55, from: "start" },
          ease: "power3.out",
          delay: 0.15,
        });
        gsap.from(".site-footer", {
          scrollTrigger: { trigger: ".site-footer", start: "top 90%" },
          opacity: 0,
          y: 22,
          duration: 0.6,
          ease: "power3.out",
        });
        if (window.matchMedia("(hover:hover)").matches) init3DTilt();
      }

      /* ── 3D Card tilt ──────────────────────────────────────────────── */
      function init3DTilt() {
        document.querySelectorAll(".menu-card").forEach((card) => {
          card.addEventListener("mousemove", (e) => {
            const r = card.getBoundingClientRect();
            const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
            const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
            gsap.to(card, {
              rotateY: nx * 7,
              rotateX: -ny * 7,
              transformPerspective: 700,
              duration: 0.35,
              ease: "power2.out",
            });
          });
          card.addEventListener("mouseleave", () => {
            gsap.to(card, {
              rotateX: 0,
              rotateY: 0,
              duration: 0.6,
              ease: "elastic.out(1,.55)",
            });
          });
        });
      }

      /* ── Filter ────────────────────────────────────────────────────── */
      function filterCat(cat, btn) {
        document
          .querySelectorAll(".cat-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const allCards = document.querySelectorAll(".menu-card");
        gsap.to(allCards, {
          opacity: 0,
          y: 12,
          duration: 0.18,
          stagger: 0.02,
          ease: "power2.in",
          onComplete: () => {
            document.querySelectorAll(".cat-group").forEach((g) => {
              g.classList.toggle(
                "hidden",
                cat !== "all" && g.dataset.group !== cat,
              );
            });
            const visible = document.querySelectorAll(
              ".cat-group:not(.hidden) .menu-card",
            );
            gsap.fromTo(
              visible,
              { opacity: 0, y: 20 },
              {
                opacity: 1,
                y: 0,
                duration: 0.42,
                stagger: 0.08,
                ease: "power3.out",
              },
            );
          },
        });
      }

      /* ================================================================
   MODAL / POPUP (ciri khas dipertahankan)
   ================================================================ */
      let flyImg = null,
        flyTopEl = null,
        flyTextEl = null,
        lastScroll = 0;

      function starStr(n) {
        return "★".repeat(n) + "☆".repeat(5 - n);
      }

      function openModal(card) {
        /* Ambil data dari global store */
        const idx = parseInt(card.dataset.idx, 10);
        const item = window.MENU_DATA[idx];
        if (!item) return;

        const cat = (item.category || "main").toLowerCase().trim();
        const data = {
          img: item.image || item.img || FALLBACK_IMG,
          name: item.name || "",
          price: formatRupiah(parsePrice(item.price)) || "",
          category: CAT_LABELS[cat] || item.category,
          stars: Math.min(5, Math.max(1, parseInt(item.stars) || 5)),
          desc: item.desc || item.description || "",
          tags: (item.tags || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        };

        const cardImg = card.querySelector(".menu-img");
        const rect = cardImg.getBoundingClientRect();
        lastScroll = window.scrollY;

        const imgW = Math.min(200, window.innerWidth * 0.52);
        const imgH = imgW;
        const cx = (window.innerWidth - imgW) / 2;
        const cy = Math.max(68, window.innerHeight * 0.17);

        /* Fly image */
        flyImg = document.createElement("img");
        flyImg.src = data.img;
        flyImg.className = "fly-img";
        Object.assign(flyImg.style, {
          left: rect.left + "px",
          top: rect.top + "px",
          width: rect.width + "px",
          height: rect.height + "px",
          objectFit: "cover",
        });
        document.body.appendChild(flyImg);

        /* Top branding */
        flyTopEl = document.createElement("div");
        flyTopEl.className = "fly-top";
        flyTopEl.innerHTML = `
        <div class="ft-brand">Bistro Kekinian</div>
        <div class="ft-sub">Fine Food &amp; Beverages</div>
        <div class="ft-orn"><div class="ft-gem"></div></div>`;
        Object.assign(flyTopEl.style, {
          left: "0",
          width: "100%",
          top: Math.max(6, cy - 86) + "px",
        });
        document.body.appendChild(flyTopEl);

        /* Bottom detail (scrollable) */
        flyTextEl = document.createElement("div");
        flyTextEl.className = "fly-text active";
        const tagsHTML = data.tags
          .map((t) => `<span class="ft-tag">${t}</span>`)
          .join("");
        flyTextEl.innerHTML = `
        <div class="ft-cat">${data.category}</div>
        <div class="ft-name">${data.name}</div>
        <div class="ft-stars">${starStr(data.stars)}</div>
        <div class="ft-price">${data.price}</div>
        <div class="ft-divider"><div class="ft-dot"></div></div>
        <div class="ft-desc">${data.desc}</div>
        <div class="ft-tags">${tagsHTML}</div>
        <button class="ft-order" id="modalAddBtn" onclick="event.stopPropagation();handleModalAdd(${idx})">Tambah ke Catatan</button>`;
        const textTop = cy + imgH + 14;
        Object.assign(flyTextEl.style, {
          left: "0",
          width: "100%",
          padding: "0 26px",
          top: textTop + "px",
          maxHeight: window.innerHeight - textTop - 8 + "px",
        });
        document.body.appendChild(flyTextEl);

        /* Overlay */
        const overlay = document.getElementById("menuModal");
        overlay.style.display = "block";

        /* Scroll lock */
        document.body.style.position = "fixed";
        document.body.style.top = `-${lastScroll}px`;
        document.body.style.width = "100%";

        /* GSAP timeline */
        const tl = gsap.timeline();
        tl.fromTo(
          overlay,
          { opacity: 0 },
          { opacity: 1, duration: 0.35, ease: "power2.out" },
          0,
        );
        tl.to(
          overlay,
          { backdropFilter: "blur(22px)", duration: 0.42, ease: "power2.out" },
          0,
        );
        tl.to(
          flyImg,
          {
            left: cx,
            top: cy,
            width: imgW,
            height: imgH,
            borderRadius: "16px",
            duration: 0.52,
            ease: "back.out(1.4)",
          },
          0,
        );
        tl.fromTo(
          flyTopEl,
          { opacity: 0, y: -16 },
          { opacity: 1, y: 0, duration: 0.42, ease: "power3.out" },
          0.27,
        );

        gsap.set(flyTextEl, { opacity: 1 });
        tl.fromTo(
          Array.from(flyTextEl.children),
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.38,
            stagger: 0.06,
            ease: "power3.out",
          },
          0.32,
        );

        overlay.onclick = closeModal;
      }

      function closeModal() {
        const overlay = document.getElementById("menuModal");
        overlay.onclick = null;

        const tl = gsap.timeline({
          onComplete: () => {
            if (flyTopEl) {
              flyTopEl.remove();
              flyTopEl = null;
            }
            if (flyTextEl) {
              flyTextEl.remove();
              flyTextEl = null;
            }
            if (flyImg) {
              flyImg.remove();
              flyImg = null;
            }
            overlay.style.display = "none";
            gsap.set(overlay, { clearProps: "backdropFilter,opacity" });
            document.body.style.position = "";
            document.body.style.top = "";
            document.body.style.width = "";
            window.scrollTo(0, lastScroll);
          },
        });
        tl.to(
          [flyTopEl, flyTextEl],
          { opacity: 0, y: -10, duration: 0.25, ease: "power2.in" },
          0,
        );
        tl.to(
          flyImg,
          { opacity: 0, scale: 0.88, duration: 0.28, ease: "back.in(1.5)" },
          0.03,
        );
        tl.to(
          overlay,
          {
            opacity: 0,
            backdropFilter: "blur(0px)",
            duration: 0.28,
            ease: "power2.in",
          },
          0,
        );
      }

      /* ================================================================
   📋 TAB NOTE / CATATAN PESANAN (CART) SYSTEM
   ================================================================ */
      window.CART_DATA = JSON.parse(localStorage.getItem("bistro_cart")) || [];

      function toggleCartDrawer(open) {
        const drawer = document.getElementById("cartDrawer");
        const overlay = document.getElementById("cartOverlay");
        if (open) {
          renderCart();
          drawer.classList.add("open");
          overlay.classList.add("show");
          document.body.style.overflow = "hidden"; // Lock page scroll
        } else {
          drawer.classList.remove("open");
          overlay.classList.remove("show");
          document.body.style.overflow = ""; // Unlock
        }
      }

      function updateCartUI() {
        const badge = document.getElementById("cartBadge");
        const bar = document.getElementById("shopeeCartBar");
        const priceEl = document.getElementById("scbTotalPrice");
        const countEl = document.getElementById("scbTotalCount");

        const totalItems = window.CART_DATA.reduce(
          (acc, item) => acc + item.qty,
          0,
        );

        if (totalItems > 0) {
          let totalPrice = 0;
          window.CART_DATA.forEach((item) => {
            totalPrice += parsePrice(item.price) * item.qty;
          });

          badge.innerText = totalItems;
          badge.style.display = "flex";
          priceEl.innerText = formatRupiah(totalPrice);
          countEl.innerText = `${totalItems} item dipilih`;
          bar.classList.add("show");
        } else {
          badge.style.display = "none";
          bar.classList.remove("show");
          toggleCartDrawer(false); // Close if empty
        }

        updateCardControls();
      }

      function addToCart(name, price, img) {
        const existing = window.CART_DATA.find((item) => item.name === name);
        if (existing) {
          existing.qty += 1;
        } else {
          window.CART_DATA.push({ name, price, img, qty: 1 });
        }
        localStorage.setItem("bistro_cart", JSON.stringify(window.CART_DATA));
        updateCartUI();

        // ShopeeFood sticky bar icon wrapper bounce animation
        const iconWrapper = document.querySelector(".scb-icon-wrapper");
        if (iconWrapper) {
          gsap.fromTo(
            iconWrapper,
            { scale: 1 },
            {
              scale: 1.25,
              duration: 0.12,
              yoyo: true,
              repeat: 1,
              ease: "power2.out",
            },
          );
        }
      }

      function changeQty(name, amount) {
        const idx = window.CART_DATA.findIndex((item) => item.name === name);
        if (idx > -1) {
          window.CART_DATA[idx].qty += amount;
          if (window.CART_DATA[idx].qty <= 0) {
            window.CART_DATA.splice(idx, 1);
          }
          localStorage.setItem("bistro_cart", JSON.stringify(window.CART_DATA));
          updateCartUI();
          renderCart();
        }
      }

      function quickPlus(idx) {
        const item = window.MENU_DATA[idx];
        if (!item) return;
        const img = item.image || item.img || FALLBACK_IMG;
        addToCart(item.name, item.price, img);
      }

      function quickMinus(idx) {
        const item = window.MENU_DATA[idx];
        if (!item) return;
        changeQty(item.name, -1);
      }

      function updateCardControls() {
        document.querySelectorAll(".card-cart-ctrl").forEach((ctrl) => {
          const idx = parseInt(ctrl.dataset.idx, 10);
          const item = window.MENU_DATA[idx];
          if (!item) return;

          const cartItem = window.CART_DATA.find((ci) => ci.name === item.name);
          if (cartItem && cartItem.qty > 0) {
            ctrl.innerHTML = `
              <button class="quick-ctrl-btn minus" onclick="quickMinus(${idx})">−</button>
              <span class="quick-qty-val">${cartItem.qty}</span>
              <button class="quick-ctrl-btn plus" onclick="quickPlus(${idx})">+</button>
            `;
            ctrl.classList.add("active");
          } else {
            ctrl.innerHTML = `
              <button class="quick-add-btn" onclick="quickPlus(${idx})">+</button>
            `;
            ctrl.classList.remove("active");
          }
        });
      }

      function clearCart() {
        if (confirm("Kosongkan semua catatan pesanan Anda?")) {
          window.CART_DATA = [];
          localStorage.setItem("bistro_cart", JSON.stringify(window.CART_DATA));
          updateCartUI();
          renderCart();
        }
      }

      

      

      function renderCart() {
        const body = document.getElementById("cartDrawerBody");
        const totalEl = document.getElementById("cartDrawerTotal");
        body.innerHTML = "";

        if (window.CART_DATA.length === 0) {
          body.innerHTML = `<div class="empty-cart-state">Catatan pesanan kosong.<br><span style="font-size:0.8rem;color:var(--text-mid)">Klik menu untuk menambahkan item.</span></div>`;
          totalEl.innerText = "Rp 0";
          return;
        }

        let totalPrice = 0;
        window.CART_DATA.forEach((item) => {
          const itemTotal = parsePrice(item.price) * item.qty;
          totalPrice += itemTotal;

          const div = document.createElement("div");
          div.className = "cart-item";
          div.innerHTML = `
            <img src="${item.img}" alt="${item.name}" onerror="this.src='${FALLBACK_IMG}'">
            <div class="cart-item-info">
              <span class="cart-item-name">${item.name}</span>
              <span class="cart-item-price">${item.price}</span>
            </div>
            <div class="cart-item-ctrl">
              <div class="cart-ctrl-btn" onclick="changeQty('${item.name.replace(/'/g, "\\'")}', -1)">-</div>
              <span class="cart-qty">${item.qty}</span>
              <div class="cart-ctrl-btn" onclick="changeQty('${item.name.replace(/'/g, "\\'")}', 1)">+</div>
            </div>
          `;
          body.appendChild(div);
        });

        totalEl.innerText = formatRupiah(totalPrice);
      }

      function handleModalAdd(idx) {
        const item = window.MENU_DATA[idx];
        if (!item) return;

        const img = item.image || item.img || FALLBACK_IMG;
        addToCart(item.name, item.price, img);

        // Visual Feedback on Button
        const btn = document.getElementById("modalAddBtn");
        const originalText = btn.innerText;
        btn.innerText = "✓ Ditambahkan!";
        btn.style.background = "var(--amber)";
        btn.style.color = "var(--ink)";

        setTimeout(() => {
          btn.innerText = originalText;
          btn.style.background = "";
          btn.style.color = "";
          closeModal(); // Auto close detail popup
        }, 800);
      }

      // URL Parameter & Table Auto-detection
      window.addEventListener("DOMContentLoaded", () => {
        const urlParams = new URLSearchParams(window.location.search);
        window.MEJA_NO = urlParams.get("meja") || "";
        const tableInput = document.getElementById("custTable");
        if (window.MEJA_NO && tableInput) {
          tableInput.value = "Meja " + window.MEJA_NO;
          tableInput.setAttribute("readonly", "true");
          tableInput.style.opacity = "0.6";
          tableInput.style.pointerEvents = "none";
        }
      });

      async function submitOrder() {
        if (window.CART_DATA.length === 0)
          return alert("Catatan pesanan masih kosong.");

        const custName = document.getElementById("custName").value.trim();
        let custTable = document.getElementById("custTable").value.trim();

        if (!custName) return alert("Mohon isi nama Anda terlebih dahulu.");
        if (window.MEJA_NO) custTable = window.MEJA_NO; // Paksa gunakan nomor meja dari URL jika ada

        const btn = document.getElementById("btnCheckout");
        btn.innerText = "Mengirim...";
        btn.disabled = true;

        let total = 0;
        const details = window.CART_DATA.map((item) => {
          total += parsePrice(item.price) * item.qty;
          return `${item.qty}x ${item.name}`;
        }).join("\n");

        const payload = {
          action: "order",
          data: {
            nama: custName,
            meja: custTable || "-",
            total: formatRupiah(total),
            totalInt: total,
            detail: details,
          },
        };

        try {
          const res = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload),
          });
          const json = await res.json();
          if (json.status === "ok") {
            
            const handleSuccess = () => {
              showToast(`Pesanan berhasil terkirim! (ID: ${json.orderId})`);
              window.CART_DATA = [];
              localStorage.setItem("bistro_cart", JSON.stringify(window.CART_DATA));
              document.getElementById("custName").value = "";
              if (!window.MEJA_NO) document.getElementById("custTable").value = "";
              updateCartUI();
              renderCart();
              toggleCartDrawer(false);
            };

            if (json.token && window.snap) {
              window.snap.pay(json.token, {
                onSuccess: async function(result){
                  // Beritahu backend bahwa pembayaran lunas dan SIMPAN pesanan
                  try {
                    payload.data.orderId = json.orderId;
                    
                    const cpRes = await fetch(APPS_SCRIPT_URL, {
                      method: "POST",
                      headers: { "Content-Type": "text/plain;charset=utf-8" },
                      body: JSON.stringify({ action: "confirm_payment", data: payload.data })
                    });
                    const cpJson = await cpRes.json();
                    
                    if (cpJson.status === "ok") {
                      handleSuccess();
                    } else {
                      showToast("Validasi pembayaran gagal: " + cpJson.message);
                    }
                  } catch(e) {
                    showToast("Kesalahan saat validasi pesanan.");
                    console.error(e);
                  }
                },
                onPending: function(result){
                  showToast("Menunggu pembayaran Anda!");
                  handleSuccess();
                },
                onError: function(result){
                  showToast("Pembayaran gagal!");
                },
                onClose: function(){
                  showToast('Pesanan dibatalkan (Belum dibayar).');
                }
              });
            } else {
              handleSuccess();
            }
            
          } else {
            alert("Gagal mengirim pesanan: " + json.message);
          }
        } catch (err) {
          alert("Terjadi kesalahan koneksi saat mengirim pesanan.");
        } finally {
          btn.innerText = "Kirim Pesanan";
          btn.disabled = false;
        }
      }

      // Initial badge render on load
      updateCartUI();
// Expose functions for inline HTML handlers
window.addToCart = addToCart;
window.quickPlus = quickPlus;
window.quickMinus = quickMinus;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleCartDrawer = toggleCartDrawer;
window.handleModalAdd = handleModalAdd;
window.submitOrder = submitOrder;
window.filterCat = filterCat;
window.clearCart = clearCart;
window.changeQty = changeQty;
