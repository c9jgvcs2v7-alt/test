const USER_ID_KEY = "user_id_v1";
const API_BASE_KEY = "api_base_url";
const PENDING_KEY = "editor_pending_result";

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

function readPending() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function clearPending() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch (_) {}
}

function renderPreview(obj) {
  if (!obj) return;
  lottie.loadAnimation({
    container: document.getElementById("lottie"),
    renderer: "svg",
    loop: true,
    autoplay: true,
    animationData: obj,
    rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
  });
}

function setupSave(obj, templateId) {
  const btn = document.getElementById("saveBtn");
  btn.addEventListener("click", async () => {
    if (!obj) return;
    const payload = {
      userId: getUserId(),
      templateId: templateId || "unknown",
      status: "draft",
      lottieJson: obj,
    };

    try {
      const res = await fetch(`${getApiBase()}/emojis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("save failed");
    } catch (_) {
      alert("Не удалось сохранить. Проверьте сервер.");
      return;
    }

    clearPending();
    window.location.href = "./my.html";
  });
}

const pending = readPending();
renderPreview(pending?.lottieJson || null);
setupSave(pending?.lottieJson || null, pending?.templateId || null);

const backBtn = document.getElementById("backBtn");
if (backBtn) {
  backBtn.addEventListener("click", () => {
    if (pending?.templateId) {
      window.location.href = `./editor.html?id=${encodeURIComponent(pending.templateId)}`;
    } else {
      window.location.href = "./catalog.html";
    }
  });
}
