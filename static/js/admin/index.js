import { initAdminUsers } from "./users.js";
import { initAdminAudit } from "./audit.js";
import { initAdminOverview } from "./overview.js";
import { initAdminSessions } from "./sessions.js";

document.addEventListener("DOMContentLoaded", () => {
  initAdminUsers();
  initAdminAudit();
  initAdminOverview();
  initAdminSessions();
});
