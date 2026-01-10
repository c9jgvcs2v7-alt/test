async function loadTemplates() {
  const res = await fetch("../data/cards.json", { cache: "no-store" });
  if (!res.ok) throw new Error("cards.json not found");
  const data = await res.json();
  const items = Array.isArray(data) ? data : data.items || [];
  if (!Array.isArray(items)) throw new Error("Invalid cards.json format");

  return items
    .filter((x) => x && x.lottiePath)
    .map((x, i) => {
      const id = x.id ?? `item-${i}`;
      return {
        id,
        lottiePath: x.lottiePath,
        href: `./template.html?id=${encodeURIComponent(String(id))}`,
        hasLogo: typeof x.hasLogo === "boolean" ? x.hasLogo : null,
        colorsCount: Number.isFinite(Number(x.colorsCount)) ? Number(x.colorsCount) : null,
      };
    });
}

const FILTERS = [
  { id: "all", label: "Все", fn: () => true },
  { id: "logo_yes", label: "С логотипом", fn: (t) => t.hasLogo === true },
  { id: "logo_no", label: "Без логотипа", fn: (t) => t.hasLogo === false },
  { id: "simple", label: "Простые", fn: (t) => t.colorsCount !== null && t.colorsCount <= 3 },
];

let allTemplates = [];
let activeFilterId = "all";

function renderChips() {
  const chips = document.getElementById("chips");
  chips.innerHTML = "";

  FILTERS.forEach((f) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = f.label;
    btn.setAttribute("aria-selected", String(f.id === activeFilterId));

    btn.addEventListener("click", () => {
      if (activeFilterId === f.id) return;
      activeFilterId = f.id;
      renderChips();
      renderGrid();
    });

    chips.appendChild(btn);
  });
}

function getFilteredTemplates() {
  const f = FILTERS.find((x) => x.id === activeFilterId) ?? FILTERS[0];
  return allTemplates.filter(f.fn);
}

const animByEl = new WeakMap();
const loadedEl = new WeakSet();

function ensureAnimation(el, path) {
  if (loadedEl.has(el)) return;
  loadedEl.add(el);

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
      if (!path) continue;

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

function renderGrid() {
  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  const visible = getFilteredTemplates();

  io.disconnect();
  grid.innerHTML = "";

  status.textContent = String(visible.length);

  visible.forEach((t) => {
    const card = document.createElement("a");
    card.className = "card";
    card.href = t.href;
    card.setAttribute("aria-label", "Открыть шаблон");

    card.innerHTML = `
      <div class="stage">
        <div class="lottie" data-path="${t.lottiePath}"></div>
      </div>
    `;

    grid.appendChild(card);

    const lottieEl = card.querySelector(".lottie");
    io.observe(lottieEl);
  });
}

function showError(msg) {
  const el = document.getElementById("error");
  el.style.display = "block";
  el.textContent = String(msg);
}

function setupBottomNav() {
  document.querySelectorAll(".navItem").forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.dataset.route;
      if (route === "catalog") return;

      if (route === "my") window.location.href = "./my.html";
      if (route === "profile") window.location.href = "./profile.html";
    });
  });
}

(async () => {
  try {
    setupBottomNav();
    renderChips();
    allTemplates = await loadTemplates();
    renderGrid();
  } catch (e) {
    showError(e?.message || e);
    document.getElementById("status").textContent = "—";
  }
})();
