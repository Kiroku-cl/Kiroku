import { showToast } from "../../app.js";

export function initNavbarLogout() {
  const logoutButton = document.querySelector("[data-logout-button]");
  if (!logoutButton) {
    return;
  }

  const logoutUrl = logoutButton.dataset.logoutUrl;
  if (!logoutUrl) {
    return;
  }

  logoutButton.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(logoutUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      if (data.ok) {
        window.location.href = data.redirect;
      } else {
        showToast(data.error || "Error al cerrar sesión", "error");
      }
    } catch (error) {
      console.error("Error during logout:", error);
      showToast("Error de red al cerrar sesión", "error");
    }
  });
}
