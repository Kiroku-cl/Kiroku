export function initAdminSessions() {
  const sessionsBody = document.querySelector("#sessions-table tbody");
  if (!sessionsBody) {
    return;
  }

  let sessionsTable = null;

  function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
            <i class="bi bi-info-circle-fill toast-icon info"></i>
            <span class="toast-message">${message}</span>
        `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short"
    });
  }

  function renderSessions(sessions) {
    const rowsHtml = sessions
      .map((session) => {
        const badge = session.is_connected
          ? '<span class="badge success">Conectado</span>'
          : '<span class="badge">Activo</span>';
        return `
                <tr>
                    <td>${session.username || session.user_id}</td>
                    <td>${formatDate(session.last_seen_at)}</td>
                    <td>${session.ip || "-"}</td>
                    <td>${badge}</td>
                    <td>
                        <div class="admin-actions">
                            <button class="btn btn-secondary btn-small" data-session-id="${session.id}">Revocar</button>
                        </div>
                    </td>
                </tr>
            `;
      })
      .join("");

    if (sessionsTable) {
      const tempBody = document.createElement("tbody");
      tempBody.innerHTML = rowsHtml;
      sessionsTable.clear();
      sessionsTable.rows.add($(tempBody).children());
      sessionsTable.draw();
      return;
    }

    sessionsBody.innerHTML = rowsHtml;
    sessionsTable = $("#sessions-table").DataTable({
      pageLength: 10,
      order: [[1, "desc"]],
      language: {
        search: "Buscar",
        lengthMenu: "Mostrar _MENU_",
        info: "Mostrando _START_ a _END_ de _TOTAL_",
        paginate: { previous: "Anterior", next: "Siguiente" }
      }
    });
  }

  async function loadSessions() {
    const res = await fetch("/api/admin/sessions");
    const data = await res.json();
    if (!data.ok) return;
    renderSessions(data.sessions || []);
  }

  async function revokeSession(sessionId) {
    confirmAction({
      title: "Revocar sesión",
      message: "Se cerrará la sesión inmediatamente.",
      confirmText: "Revocar",
      onConfirm: async () => {
        const res = await fetch(`/api/admin/sessions/${sessionId}/revoke`, {
          method: "POST"
        });
        const data = await res.json();
        if (!data.ok) {
          showToast(data.error || "Error al revocar");
          return;
        }
        showToast("Sesión revocada");
        await loadSessions();
      }
    });
  }

  function confirmAction({ title, message, confirmText, onConfirm }) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
            <div class="modal-card">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="confirm-cancel">Cancelar</button>
                    <button class="btn btn-action warning" id="confirm-apply">${confirmText}</button>
                </div>
            </div>
        `;
    document.body.appendChild(overlay);

    overlay
      .querySelector("#confirm-cancel")
      .addEventListener("click", () => overlay.remove());
    overlay.querySelector("#confirm-apply").addEventListener("click", async () => {
      await onConfirm();
      overlay.remove();
    });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-session-id]");
    if (!button) return;
    const sessionId = button.dataset.sessionId;
    if (!sessionId) return;
    revokeSession(sessionId);
  });

  loadSessions();
}
