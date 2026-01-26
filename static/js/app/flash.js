export function initFlashMessages() {
  const flashes = document.querySelectorAll(".flash");
  if (!flashes.length) {
    return;
  }

  setTimeout(() => {
    flashes.forEach((el) => {
      el.style.animation = "flash-in 0.3s ease reverse forwards";
      setTimeout(() => el.remove(), 300);
    });
  }, 5000);
}
