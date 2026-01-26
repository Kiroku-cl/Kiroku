export function initAdminOverview() {
  const overviewGrid = document.getElementById("overview-grid");
  if (!overviewGrid) {
    return;
  }

  let hourlyChart = null;

  async function loadOverview() {
    const res = await fetch("/api/admin/overview");
    const data = await res.json();
    if (!data.ok) return;

    const stats = data.stats || {};
    document.getElementById("stat-jobs-processing").textContent =
      stats.jobs_processing ?? 0;
    document.getElementById("stat-jobs-error").textContent = stats.jobs_error ?? 0;
    document.getElementById("stat-images-processing").textContent =
      stats.images_processing ?? 0;
  }

  function formatDateInput(date) {
    return date.toISOString().split("T")[0];
  }

  async function loadHourlyProjects(dateValue) {
    const res = await fetch(`/api/admin/overview/projects-hourly?date=${dateValue}`);
    const data = await res.json();
    if (!data.ok) return;

    const labels = data.hours || [];
    const projectCounts = data.project_counts || [];
    const photoCounts = data.photo_counts || [];

    const ctx = document.getElementById("projects-hourly-chart");
    if (hourlyChart) {
      hourlyChart.destroy();
    }
    hourlyChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Proyectos",
            data: projectCounts,
            borderColor: "rgba(246, 7, 97, 0.9)",
            backgroundColor: "rgba(246, 7, 97, 0.2)",
            fill: true,
            tension: 0.35
          },
          {
            label: "Imágenes",
            data: photoCounts,
            borderColor: "rgba(255, 255, 255, 0.45)",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            fill: true,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            labels: { color: "#9da5b4" }
          }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  const today = new Date();
  const dateInput = document.getElementById("projects-date");
  dateInput.value = formatDateInput(today);
  document
    .getElementById("projects-date-apply")
    .addEventListener("click", () => {
      loadHourlyProjects(dateInput.value);
    });

  loadOverview();
  loadHourlyProjects(dateInput.value);
}
