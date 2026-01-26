export function initChangePasswordForm() {
  const form = document.getElementById("change-password-form");
  if (!form) {
    return;
  }

  const errorDiv = document.getElementById("error-message");
  const successDiv = document.getElementById("success-message");
  const submitBtn = document.getElementById("submit-btn");

  fetch("/api/me")
    .then((r) => r.json())
    .then((data) => {
      if (data.ok && data.user.must_change_password) {
        document.getElementById("subtitle").textContent =
          "Debes cambiar tu contraseña antes de continuar";
        document.getElementById("cancel-btn").style.display = "none";
      }
    })
    .catch(() => null);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    errorDiv.classList.remove("show");
    successDiv.classList.remove("show");

    const currentPassword = document.getElementById("current_password").value;
    const newPassword = document.getElementById("new_password").value;
    const confirmPassword = document.getElementById("confirm_password").value;

    if (newPassword !== confirmPassword) {
      errorDiv.textContent = "Las contraseñas no coinciden";
      errorDiv.classList.add("show");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Guardando...';

    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (data.ok) {
        successDiv.textContent =
          "Contraseña actualizada correctamente. Redirigiendo...";
        successDiv.classList.add("show");
        setTimeout(() => {
          window.location.href = data.redirect;
        }, 1500);
      } else {
        errorDiv.textContent = data.error;
        errorDiv.classList.add("show");
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Guardar cambios';
      }
    } catch (err) {
      errorDiv.textContent = "Error de conexión. Intenta de nuevo.";
      errorDiv.classList.add("show");
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Guardar cambios';
    }
  });
}
