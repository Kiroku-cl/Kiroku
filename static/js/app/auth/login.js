export function initLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) {
    return;
  }

  const errorDiv = document.getElementById("error-message");
  const submitBtn = document.getElementById("submit-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    errorDiv.classList.remove("show");
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Iniciando...';

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.ok) {
        window.location.href = data.redirect;
      } else {
        errorDiv.textContent = data.error;
        errorDiv.classList.add("show");
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Iniciar sesión';
      }
    } catch (err) {
      errorDiv.textContent = "Error de conexión. Intenta de nuevo.";
      errorDiv.classList.add("show");
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Iniciar sesión';
    }
  });
}
