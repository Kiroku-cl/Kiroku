import { HiloApp } from "../../app.js";
import { initFlashMessages } from "./flash.js";
import { initNavbarLogout } from "./navbar.js";
import { initProjectsPage } from "./projects.js";
import { initResultPage } from "./result.js";
import { initLoginForm } from "./auth/login.js";
import { initChangePasswordForm } from "./auth/change_password.js";

function initRecordingApp() {
  const preview = document.getElementById("preview");
  const startButton = document.getElementById("btn-start");
  if (!preview || !startButton) {
    return;
  }
  new HiloApp();
}

document.addEventListener("DOMContentLoaded", () => {
  initFlashMessages();
  initNavbarLogout();
  initRecordingApp();
  initProjectsPage();
  initResultPage();
  initLoginForm();
  initChangePasswordForm();
});
