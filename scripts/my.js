// Temporary local storage for MVP testing
      const STORAGE_KEY = "my_emojis_v1";
      const USER_ID_KEY = "user_id_v1";
      const API_BASE_KEY = "api_base_url";

      function getUserId() {
        try {
          return localStorage.getItem(USER_ID_KEY) || "0";
        } catch (_) {
          return "0";
        }
      }

      function getApiBase() {
        try {
          return localStorage.getItem(API_BASE_KEY) || "http://localhost:8000";
        } catch (_) {
          return "http://localhost:8000";
        }
      }

      function readMyEmojis() {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const arr = raw ? JSON.parse(raw) : [];
          return Array.isArray(arr) ? arr : [];
        } catch (_) {
          return [];
        }
      }

      function writeMyEmojis(items) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }

      // DEV seed (remove later)
      function seedIfEmpty() {}

      // Lottie lifecycle
      const animByEl = new WeakMap();
      const loadedEl = new WeakSet();

      function ensureAnimation(el, path) {
        if (loadedEl.has(el)) return;
        loadedEl.add(el);

        const json = el.getAttribute("data-json");
        if (json) {
          const anim = lottie.loadAnimation({
            container: el,
            renderer: "svg",
            loop: true,
            autoplay: false,
            animationData: JSON.parse(decodeURIComponent(json)),
            rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
          });
          animByEl.set(el, anim);
          return;
        }

        const anim = lottie.loadAnimation({
          container: el,
          renderer: "svg",
          loop: true,
          autoplay: false,
          path,
          rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
        });

        anim.addEventListener?.("data_failed", () => {
          try {
            anim.destroy();
          } catch (_) {}
          el.innerHTML = "";
        });

        animByEl.set(el, anim);
      }

      function play(el) {
        const anim = animByEl.get(el);
        if (anim) anim.play();
      }

      function pause(el) {
        const anim = animByEl.get(el);
        if (anim) anim.pause();
      }

      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const el = entry.target;
            const path = el.getAttribute("data-path");
            const json = el.getAttribute("data-json");
            if (!path && !json) continue;

            if (entry.isIntersecting) {
              ensureAnimation(el, path);
              play(el);
            } else {
              pause(el);
            }
          }
        },
        { root: null, rootMargin: "120px 0px", threshold: 0.15 }
      );

      const app = document.getElementById("app");
      const overlay = document.getElementById("sheetOverlay");
      const actionsBox = document.getElementById("actions");
      const sheetTitle = document.getElementById("sheetTitle");

      let activeItem = null;

      function closeSheet() {
        activeItem = null;
        app.classList.remove("sheetOpen");
        actionsBox.innerHTML = "";
      }

      function openSheet(item) {
        activeItem = item;
        sheetTitle.textContent = item.status === "paid" ? "Оплаченный эмодзи" : "Черновик";
        actionsBox.innerHTML = "";

        const actions =
          item.status === "paid"
            ? [{ id: "download", label: "Получить .tgs" }]
            : [
                { id: "pay", label: "Оплатить" },
                { id: "delete", label: "Удалить" },
              ];

        actions.forEach((a) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "actionBtn";
          btn.innerHTML = `<span>${a.label}</span><span class="actionNote"></span>`;
          btn.addEventListener("click", () => onAction(a.id));
          actionsBox.appendChild(btn);
        });

        app.classList.add("sheetOpen");
      }

      async function onAction(actionId) {
        const item = activeItem;
        if (!item) return;

        if (actionId === "pay") {
          try {
            await fetch(`${getApiBase()}/emojis/${encodeURIComponent(item.id)}?userId=${encodeURIComponent(getUserId())}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "paid" }),
            });
          } catch (_) {}
          closeSheet();
          await render();
          return;
        }

        if (actionId === "download") {
          alert("Скачивание .tgs будет добавлено позже.");
          return;
        }

        if (actionId === "download") {
          alert("Выгрузка .tgs будет добавлена позже.");
          return;
        }

        if (actionId === "delete") {
          const ok = confirm("Удалить эмодзи?");
          if (!ok) return;
          try {
            await fetch(`${getApiBase()}/emojis/${encodeURIComponent(item.id)}?userId=${encodeURIComponent(getUserId())}`, {
              method: "DELETE",
            });
          } catch (_) {}
          closeSheet();
          await render();
          return;
        }
      }

      async function render() {
        const grid = document.getElementById("grid");
        const empty = document.getElementById("empty");
        const countPill = document.getElementById("countPill");

        io.disconnect();
        grid.innerHTML = "";

        const uid = getUserId();
        let items = [];
        try {
          const res = await fetch(`${getApiBase()}/emojis?userId=${encodeURIComponent(uid)}`);
          if (res.ok) {
            const data = await res.json();
            items = Array.isArray(data.items) ? data.items : [];
          }
        } catch (_) {}
        items = items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (!items.length) {
          empty.style.display = "block";
          countPill.style.display = "none";
          return;
        }

        empty.style.display = "none";
        countPill.style.display = "inline-flex";
        countPill.textContent = String(items.length);

        items.forEach((item) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "cardBtn";
          btn.setAttribute("aria-label", "Открыть действия");

          btn.innerHTML = `
            <div class="card">
              <div class="badge ${item.status === "paid" ? "is-paid" : ""}">
                ${item.status === "paid" ? "Оплачено" : "Черновик"}
              </div>
              <div class="stage">
                <div class="lottie" data-path="${item.lottiePath || ""}" data-json="${item.lottieJson ? encodeURIComponent(JSON.stringify(item.lottieJson)) : ""}"></div>
              </div>
            </div>
          `;

          btn.addEventListener("click", () => openSheet(item));

          grid.appendChild(btn);

          const lottieEl = btn.querySelector(".lottie");
          io.observe(lottieEl);
        });
      }

      // ✅ Bottom nav routing (WORKING)
      function setupBottomNav() {
        document.querySelectorAll(".navItem").forEach((btn) => {
          btn.addEventListener("click", () => {
            const route = btn.dataset.route;
            if (route === "my") return;

            if (route === "catalog") window.location.href = "./catalog.html";
            if (route === "profile") window.location.href = "./profile.html";
          });
        });
      }

      overlay.addEventListener("click", closeSheet);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeSheet();
      });

      document.getElementById("goCatalogBtn").addEventListener("click", () => {
        window.location.href = "./catalog.html";
      });

      (async () => {
        setupBottomNav();
        seedIfEmpty();
        await render();
      })();
