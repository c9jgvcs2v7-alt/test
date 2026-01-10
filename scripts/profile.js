const USER_ID_KEY = "user_id_v1";

function getUserId() {
  try {
    return localStorage.getItem(USER_ID_KEY) || "0";
  } catch (_) {
    return "0";
  }
}

function setUserId(value) {
  try {
    localStorage.setItem(USER_ID_KEY, value);
  } catch (_) {}
}

function setupUserId() {
  const input = document.getElementById("userIdInput");
  if (!input) return;
  input.value = getUserId();

  input.addEventListener("input", () => {
    const next = String(input.value || "").trim();
    setUserId(next || "0");
  });
}

function setupBottomNav() {
        document.querySelectorAll(".navItem").forEach((btn) => {
          btn.addEventListener("click", () => {
            const route = btn.dataset.route;
            if (route === "profile") return;

            if (route === "catalog") window.location.href = "./catalog.html";
            if (route === "my") window.location.href = "./my.html";
          });
        });
      }

      setupUserId();
      setupBottomNav();
