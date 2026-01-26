export function initAdminUsers() {
  const usersTableBody = document.querySelector("#users-table tbody");
  if (!usersTableBody) {
    return;
  }

  let usersTable = null;
  const usersMap = new Map();

  function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
            <i class="bi bi-info-circle-fill toast-icon ${type}"></i>
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

  function renderUsers(users) {
    usersMap.clear();
    const rowsHtml = users
      .map((user) => {
        usersMap.set(String(user.id), user);
        const statusBadge = user.is_active
          ? '<span class="badge success">Activo</span>'
          : '<span class="badge error">Inactivo</span>';
        const adminBadge = user.is_admin ? '<span class="badge warning">Admin</span>' : "";
        const stylize = user.can_stylize_images ? "Stylize" : "Sin stylize";
        const recordingUsedMinutes = Math.floor((user.recording_seconds_used || 0) / 60);
        const recordingQuota = user.recording_minutes_quota ?? "∞";
        const recordingWindow = user.recording_window_days
          ? `cada ${user.recording_window_days}d`
          : "sin reset";
        const quotas = `
                <div class="quota-stack">
                    <div class="quota-item">
                        <span class="quota-label">Stylize</span>
                        <span class="quota-value">${user.daily_stylize_quota ?? "∞"}</span>
                        <span class="quota-pill">usados ${user.stylizes_used_in_window}</span>
                    </div>
                    <div class="quota-item">
                        <span class="quota-label">Grabación</span>
                        <span class="quota-value">${recordingQuota} min</span>
                        <span class="quota-pill">${recordingWindow}</span>
                        <span class="quota-pill">usados ${recordingUsedMinutes} min</span>
                    </div>
                </div>
            `;

        return `
                <tr>
                    <td>
                        <strong>${user.username}</strong><br>
                        <span class="badge neutral">${stylize}</span>
                        ${adminBadge}
                    </td>
                    <td>${statusBadge}</td>
                    <td>${quotas}</td>
                    <td>${formatDate(user.last_login_at)}</td>
                    <td>
                        <div class="admin-actions">
                            <button class="btn btn-action btn-small" data-action="edit-user" data-user-id="${user.id}">Editar</button>
                            ${user.is_active ? `
                                <button class="btn btn-action warning btn-small" data-action="deactivate-user" data-user-id="${user.id}">Desactivar</button>
                            ` : `
                                <button class="btn btn-action success btn-small" data-action="activate-user" data-user-id="${user.id}">Activar</button>
                            `}
                            <button class="btn btn-action danger btn-small" data-action="delete-user" data-user-id="${user.id}">Eliminar</button>
                        </div>
                    </td>
                </tr>
            `;
      })
      .join("");

    if (usersTable) {
      const tempBody = document.createElement("tbody");
      tempBody.innerHTML = rowsHtml;
      usersTable.clear();
      usersTable.rows.add($(tempBody).children());
      usersTable.draw();
      return;
    }

    usersTableBody.innerHTML = rowsHtml;
    usersTable = $("#users-table").DataTable({
      pageLength: 10,
      order: [[0, "asc"]],
      language: {
        search: "Buscar",
        lengthMenu: "Mostrar _MENU_",
        info: "Mostrando _START_ a _END_ de _TOTAL_",
        paginate: { previous: "Anterior", next: "Siguiente" }
      }
    });
  }

  async function reloadUsersTable() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (!data.ok) return;
    renderUsers(data.users || []);
  }

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (!data.ok) return;
    renderUsers(data.users || []);
  }

  document.getElementById("open-create-user").addEventListener("click", () => {
    openCreateUser();
  });

  function showTempPassword(username, tempPassword, message) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const bodyMessage =
      message ||
      `Usuario creado correctamente. Entrega esta contraseña solo una vez a <strong>${username}</strong>.`;
    overlay.innerHTML = `
            <div class="modal-card">
                <h3>Contraseña temporal</h3>
                <p>${bodyMessage}</p>
                <div class="temp-password-row">
                    <div class="form-control temp-password-value">${tempPassword}</div>
                    <button class="btn btn-action" data-copy-password>
                        <i class="bi bi-clipboard"></i>
                        Copiar
                    </button>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" data-close-modal>Cerrar</button>
                </div>
            </div>
        `;
    document.body.appendChild(overlay);
    overlay
      .querySelector("[data-close-modal]")
      .addEventListener("click", () => overlay.remove());
    overlay
      .querySelector("[data-copy-password]")
      .addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(tempPassword);
          showToast("Contraseña copiada");
        } catch (err) {
          showToast("No se pudo copiar", "error");
        }
      });
  }

  async function deactivateUser(userId, username) {
    confirmAction({
      title: "Desactivar usuario",
      message: `Se cerrarán las sesiones de ${username}.`,
      confirmText: "Desactivar",
      onConfirm: async () => {
        const res = await fetch(`/api/admin/user/${userId}/deactivate`, { method: "POST" });
        const data = await res.json();
        if (!data.ok) {
          showToast(data.error || "Error al desactivar");
          return;
        }
        await reloadUsersTable();
        showToast("Usuario desactivado correctamente");
      }
    });
  }

  async function activateUser(userId, username) {
    confirmAction({
      title: "Activar usuario",
      message: `Se habilitará el acceso para ${username}.`,
      confirmText: "Activar",
      confirmClass: "btn-action success",
      onConfirm: async () => {
        const res = await fetch(`/api/admin/user/${userId}/activate`, { method: "POST" });
        const data = await res.json();
        if (!data.ok) {
          showToast(data.error || "Error al activar");
          return;
        }
        await reloadUsersTable();
        showToast("Usuario activado correctamente");
      }
    });
  }

  async function deleteUser(userId, username) {
    confirmAction({
      title: "Eliminar usuario",
      message: "Esta acción es irreversible.",
      confirmText: "Eliminar",
      confirmClass: "btn-action danger",
      onConfirm: async () => {
        const res = await fetch(`/api/admin/user/${userId}`, { method: "DELETE" });
        const data = await res.json();
        if (!data.ok) {
          showToast(data.error || "Error al eliminar");
          return;
        }
        await reloadUsersTable();
        showToast("Usuario eliminado correctamente");
      }
    });
  }

  function openCreateUser() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
            <div class="modal-card">
                <h3>Crear usuario</h3>
                <div class="admin-form-grid">
                    <div class="form-group">
                        <label class="form-label">Username</label>
                        <input type="text" class="form-control" id="create-username" placeholder="usuario" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Activo</label>
                        <select class="form-control" id="create-active">
                            <option value="true" selected>Sí</option>
                            <option value="false">No</option>
                        </select>
                    </div>
                </div>
                <div class="admin-section-divider"></div>
                <div class="admin-form-grid">
                    <div class="form-group">
                        <label class="form-label">Stylize</label>
                        <div class="admin-row">
                            <label class="switch">
                                <input type="checkbox" id="create-can-stylize">
                                <span class="switch-slider"></span>
                            </label>
                            <input type="number" class="form-control" id="create-stylize" min="0" placeholder="Ilimitado">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Minutos disponibles</label>
                        <div class="admin-row">
                            <input type="number" class="form-control" id="create-recording-minutes" min="0" placeholder="Ilimitado">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Reset cada X días</label>
                        <div class="admin-row">
                            <input type="number" class="form-control" id="create-recording-window" min="0" placeholder="Sin reset">
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" data-close-modal>Cancelar</button>
                    <button class="btn btn-primary" id="create-user-submit">Crear</button>
                </div>
            </div>
        `;
    document.body.appendChild(overlay);

    overlay
      .querySelector("[data-close-modal]")
      .addEventListener("click", () => overlay.remove());

    const canStylizeSelect = overlay.querySelector("#create-can-stylize");
    const stylizeInput = overlay.querySelector("#create-stylize");

    function syncStylizeQuota() {
      const canStylize = canStylizeSelect.checked;
      if (!canStylize) {
        stylizeInput.value = "0";
        stylizeInput.disabled = true;
      } else {
        stylizeInput.disabled = false;
        if (stylizeInput.value === "0") {
          stylizeInput.value = "";
        }
      }
    }

    syncStylizeQuota();
    canStylizeSelect.addEventListener("change", syncStylizeQuota);

    overlay
      .querySelector("#create-user-submit")
      .addEventListener("click", async () => {
        const username = overlay.querySelector("#create-username").value.trim();
        if (!username) {
          showToast("Username requerido");
          return;
        }

        const dailyStylizeRaw = overlay.querySelector("#create-stylize").value.trim();
        const dailyStylize = dailyStylizeRaw === "" ? null : Number(dailyStylizeRaw);
        const recordingMinutesRaw = overlay
          .querySelector("#create-recording-minutes")
          .value.trim();
        const recordingMinutes =
          recordingMinutesRaw === "" ? null : Number(recordingMinutesRaw);
        const recordingWindowRaw = overlay
          .querySelector("#create-recording-window")
          .value.trim();
        const recordingWindowParsed =
          recordingWindowRaw === "" ? null : Number(recordingWindowRaw);
        const recordingWindow =
          recordingWindowParsed && recordingWindowParsed > 0 ? recordingWindowParsed : null;
        const canStylize = overlay.querySelector("#create-can-stylize").checked;
        const isActive = overlay.querySelector("#create-active").value === "true";

        if (
          (dailyStylize !== null && dailyStylize < 0) ||
          (recordingMinutes !== null && recordingMinutes < 0) ||
          (recordingWindowParsed !== null && recordingWindowParsed < 0)
        ) {
          showToast("Las cuotas no pueden ser negativas");
          return;
        }

        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            daily_stylize_quota: dailyStylize,
            recording_minutes_quota: recordingMinutes,
            recording_window_days: recordingWindow,
            can_stylize_images: canStylize,
            is_active: isActive
          })
        });
        const data = await res.json();
        if (!data.ok) {
          showToast(data.error || "Error creando usuario");
          return;
        }

        overlay.remove();
        showTempPassword(data.user.username, data.temp_password);
        await reloadUsersTable();
        showToast("Usuario creado correctamente");
      });
  }

  function openEditUser(user) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
            <div class="modal-card">
                <h3>Editar usuario</h3>
                <div class="admin-form-grid">
                    <div class="form-group">
                        <label class="form-label">Stylize</label>
                        <div class="admin-row">
                            <label class="switch">
                                <input type="checkbox" id="edit-can-stylize" ${
                                  user.can_stylize_images ? "checked" : ""
                                }>
                                <span class="switch-slider"></span>
                            </label>
                            <input type="number" class="form-control" id="edit-stylize" min="0" value="${
                              user.daily_stylize_quota ?? ""
                            }" placeholder="Ilimitado">
                            <button class="btn btn-action btn-small" id="reset-stylize">Reset</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Minutos disponibles</label>
                        <div class="admin-row">
                            <input type="number" class="form-control" id="edit-recording-minutes" min="0" value="${
                              user.recording_minutes_quota ?? ""
                            }" placeholder="Ilimitado">
                            <button class="btn btn-action btn-small" id="reset-recording">Reset</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Reset cada X días</label>
                        <div class="admin-row">
                            <input type="number" class="form-control" id="edit-recording-window" min="0" value="${
                              user.recording_window_days ?? ""
                            }" placeholder="Sin reset">
                        </div>
                    </div>
                </div>
                <div class="admin-section-divider"></div>
                <div class="admin-actions">
                    <button class="btn btn-action warning" id="reset-password">Reset contraseña</button>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" data-close-modal>Cancelar</button>
                    <button class="btn btn-primary" id="save-user">Guardar</button>
                </div>
            </div>
        `;
    document.body.appendChild(overlay);

    overlay
      .querySelector("[data-close-modal]")
      .addEventListener("click", () => overlay.remove());

    const editStylizeToggle = overlay.querySelector("#edit-can-stylize");
    const editStylizeInput = overlay.querySelector("#edit-stylize");

    function syncEditStylizeQuota() {
      const canStylize = editStylizeToggle.checked;
      if (!canStylize) {
        editStylizeInput.value = "0";
        editStylizeInput.disabled = true;
      } else {
        editStylizeInput.disabled = false;
        if (editStylizeInput.value === "0") {
          editStylizeInput.value = "";
        }
      }
    }

    syncEditStylizeQuota();
    editStylizeToggle.addEventListener("change", syncEditStylizeQuota);

    overlay.querySelector("#reset-stylize").addEventListener("click", () => {
      confirmAction({
        title: "Resetear cuota de stylize",
        message: `Esto reinicia el contador de stylize de ${user.username}.`,
        confirmText: "Resetear",
        onConfirm: async () => {
          const res = await fetch(`/api/admin/user/${user.id}/quota`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reset_stylize: true })
          });
          const data = await res.json();
          if (!data.ok) {
            showToast(data.error || "Error al resetear stylize");
            return;
          }
          await reloadUsersTable();
          showToast("Cuota de stylize reseteada");
        }
      });
    });

    overlay.querySelector("#reset-recording").addEventListener("click", () => {
      confirmAction({
        title: "Resetear minutos de grabación",
        message: `Esto reinicia el contador de minutos de ${user.username}.`,
        confirmText: "Resetear",
        onConfirm: async () => {
          const res = await fetch(`/api/admin/user/${user.id}/quota`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reset_recording: true })
          });
          const data = await res.json();
          if (!data.ok) {
            showToast(data.error || "Error al resetear minutos");
            return;
          }
          await reloadUsersTable();
          showToast("Minutos de grabación reseteados");
        }
      });
    });

    overlay.querySelector("#reset-password").addEventListener("click", () => {
      confirmAction({
        title: "Resetear contraseña",
        message: `Se generará una nueva contraseña temporal para ${user.username}.`,
        confirmText: "Resetear",
        onConfirm: async () => {
          const res = await fetch(`/api/admin/user/${user.id}/reset-password`, {
            method: "POST"
          });
          const data = await res.json();
          if (!data.ok) {
            showToast(data.error || "Error al resetear contraseña");
            return;
          }
          overlay.remove();
          const message = `Nueva contraseña temporal para <strong>${user.username}</strong>. Entrega esta contraseña solo una vez.`;
          showTempPassword(user.username, data.temp_password, message);
        }
      });
    });

    overlay.querySelector("#save-user").addEventListener("click", async () => {
      const dailyStylizeRaw = overlay.querySelector("#edit-stylize").value.trim();
      const dailyStylize = dailyStylizeRaw === "" ? null : Number(dailyStylizeRaw);
      const recordingMinutesRaw = overlay
        .querySelector("#edit-recording-minutes")
        .value.trim();
      const recordingMinutes = recordingMinutesRaw === "" ? null : Number(recordingMinutesRaw);
      const recordingWindowRaw = overlay
        .querySelector("#edit-recording-window")
        .value.trim();
      const recordingWindowParsed =
        recordingWindowRaw === "" ? null : Number(recordingWindowRaw);
      const recordingWindow =
        recordingWindowParsed && recordingWindowParsed > 0 ? recordingWindowParsed : null;
      const canStylize = overlay.querySelector("#edit-can-stylize").checked;

      if (
        (dailyStylize !== null && dailyStylize < 0) ||
        (recordingMinutes !== null && recordingMinutes < 0) ||
        (recordingWindowParsed !== null && recordingWindowParsed < 0)
      ) {
        showToast("Las cuotas no pueden ser negativas");
        return;
      }

      const res = await fetch(`/api/admin/user/${user.id}/flags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daily_stylize_quota: dailyStylize,
          recording_minutes_quota: recordingMinutes,
          recording_window_days: recordingWindow,
          can_stylize_images: canStylize
        })
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(data.error || "Error al guardar");
        return;
      }
      overlay.remove();
      await reloadUsersTable();
      showToast("Usuario actualizado correctamente");
    });
  }

  function confirmAction({ title, message, confirmText, confirmClass, onConfirm }) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
            <div class="modal-card">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="confirm-cancel">Cancelar</button>
                    <button class="btn ${confirmClass || "btn-action warning"}" id="confirm-apply">${confirmText}</button>
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
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const userId = button.dataset.userId;
    if (!userId) return;
    const user = usersMap.get(String(userId));
    if (!user) return;

    if (action === "edit-user") {
      openEditUser(user);
    } else if (action === "deactivate-user") {
      deactivateUser(userId, user.username);
    } else if (action === "activate-user") {
      activateUser(userId, user.username);
    } else if (action === "delete-user") {
      deleteUser(userId, user.username);
    }
  });

  loadUsers();
}
