export function initResultPage() {
  const projectId = document.body?.dataset?.projectId;
  const projectStatus = document.body?.dataset?.projectStatus;
  if (!projectId || !projectStatus) {
    return;
  }

  if (["queued", "processing"].includes(projectStatus)) {
    setInterval(async () => {
      try {
        const res = await fetch(`/api/project/${projectId}/status`);
        const data = await res.json();
        if (data.ok && !["queued", "processing"].includes(data.status)) {
          window.location.reload();
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    }, 2000);
    return;
  }

  if (projectStatus !== "done") {
    return;
  }

  async function loadPreview() {
    try {
      const res = await fetch(`/api/project/${projectId}/preview`);
      const data = await res.json();

      if (data.ok) {
        document.getElementById("preview-content").innerHTML = data.html;
      } else {
        document.getElementById("preview-content").textContent = "Error cargando preview";
      }
    } catch (err) {
      console.error("Error loading preview:", err);
      document.getElementById("preview-content").textContent = "Error cargando preview";
    }
  }

  async function copyPreview() {
    const preview = document.getElementById("preview-content");

    try {
      const range = document.createRange();
      range.selectNodeContents(preview);

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      document.execCommand("copy");

      selection.removeAllRanges();

      const toast = document.getElementById("copy-toast");
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
      alert("Error al copiar. Intenta seleccionar manualmente.");
    }
  }

  function setTheme(theme, button) {
    const preview = document.getElementById("preview-content");
    preview.classList.remove("light", "dark");
    preview.classList.add(theme);

    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    if (button) {
      button.classList.add("active");
    }
  }

  const copyButton = document.querySelector("[data-action='copy-preview']");
  if (copyButton) {
    copyButton.addEventListener("click", copyPreview);
  }

  document.querySelectorAll("[data-theme]").forEach((btn) => {
    btn.addEventListener("click", () => setTheme(btn.dataset.theme, btn));
  });

  loadPreview();
}
