import { ApiClient, UI } from "./services/api.js";
import { ManhModule } from "./modules/manhBranchHr.js";
import { YModule } from "./modules/yShiftCashflow.js";
import { TrucModule } from "./modules/trucPosKds.js";
import { LinhModule } from "./modules/linhMenu.js";
Object.assign(window, {
  ApiClient,
  UI,
  ManhModule,
  YModule,
  TrucModule,
  LinhModule,
});
window.addEventListener("session-expired", () => ManhModule.showLogin());
UI.el("scheduleDate").value = UI.today();
UI.el("reportFrom").value = UI.today();
UI.el("reportTo").value = UI.today();
UI.el("loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const button = event.submitter || event.target.querySelector("button");
  UI.run(button, async () => {
    UI.el("loginError").textContent = "";
    try {
      const r = await ApiClient.post("/auth/login", {
        SoDienThoai: UI.value("loginPhone"),
        MaPIN: UI.value("loginPin"),
      });
      UI.el("loginPin").value = "";
      await ManhModule.startSession(r.user);
      UI.notify("Đã đăng nhập.");
    } catch (error) {
      UI.el("loginError").textContent = error.message;
      throw error;
    }
  });
});
ManhModule.init().catch((error) => {
  ManhModule.showLogin();
  if (error.status !== 401) UI.el("loginError").textContent = error.message;
});
let polling = false;
setInterval(async () => {
  if (polling || document.hidden || UI.pending || !ManhModule.user) return;
  polling = true;
  try {
    await ManhModule.refresh();
  } catch (error) {
    UI.notify(error.message, true);
  } finally {
    polling = false;
  }
}, 15000);
