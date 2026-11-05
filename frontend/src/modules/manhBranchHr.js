import { ApiClient, UI } from "../services/api.js";
import { YModule } from "./yShiftCashflow.js";
import { TrucModule } from "./trucPosKds.js";
import { LinhModule } from "./linhMenu.js";
const activeStatuses = ["scheduled", "Leave_Requested"];
const ManhModule = {
  user: null,
  currentBranchId: null,
  branches: [],
  hr: null,
  epoch: 0,
  weekStart: null,
  weekHours(s) {
    const start = new Date(this.weekStart + "T00:00:00+07:00"),
      end = new Date(start.getTime() + 7 * 86400000);
    return (
      Math.max(
        0,
        Math.min(+new Date(s.KetThucLam), +end) -
          Math.max(+new Date(s.BatDauLam), +start),
      ) / 3600000
    );
  },
  get isManager() {
    return ["ADMIN", "MANAGER"].includes(this.user?.Role);
  },
  get isSeller() {
    return ["ADMIN", "MANAGER", "CASHIER"].includes(this.user?.Role);
  },
  async init() {
    const r = await ApiClient.get("/auth/me");
    await this.startSession(r.user);
  },
  async startSession(user) {
    this.user = user;
    this.weekStart = UI.monday(UI.today());
    this.currentBranchId = user.MaChiNhanh;
    UI.el("loginPanel").hidden = true;
    UI.el("app").hidden = false;
    UI.el("userInfo").textContent =
      `${user.HoTen} · ${{ ADMIN: "Chủ chuỗi", MANAGER: "Quản lý", CASHIER: "Thu ngân", BARISTA: "Pha chế / bếp", STAFF: "Nhân viên" }[user.Role]}`;
    this.applyRoles();
    await this.loadBranches();
    this.switchTab(
      user.Role === "BARISTA"
        ? "kds"
        : user.Role === "CASHIER"
          ? "pos"
          : ["MANAGER", "STAFF"].includes(user.Role)
            ? "hr"
            : "branch",
    );
  },
  applyRoles() {
    document
      .querySelectorAll("[data-roles]")
      .forEach(
        (e) =>
          (e.hidden = !e.dataset.roles.split(",").includes(this.user?.Role)),
      );
  },
  showLogin() {
    this.epoch++;
    this.user = null;
    this.hr = null;
    UI.el("app").hidden = true;
    UI.el("loginPanel").hidden = false;
    UI.el("loginPin").value = "";
    YModule.reset();
    TrucModule.reset();
    LinhModule.reset();
  },
  async loadBranches(preferId) {
    const r = await ApiClient.get("/branches");
    this.branches = r.branches;
    const preferred = preferId ?? this.currentBranchId;
    this.currentBranchId = this.branches.some((b) => b.MaChiNhanh === preferred)
      ? preferred
      : this.branches[0]?.MaChiNhanh;
    UI.el("globalBranchSelect").innerHTML = UI.options(
      this.branches,
      "MaChiNhanh",
      "TenChiNhanh",
    );
    UI.el("globalBranchSelect").value = this.currentBranchId || "";
    this.renderBranches();
    await this.onBranchChange();
  },
  async onBranchChange() {
    UI.el("notice").hidden = true;
    this.epoch++;
    this.currentBranchId = Number(UI.value("globalBranchSelect"));
    const b = this.branches.find((b) => b.MaChiNhanh === this.currentBranchId);
    UI.el("headerBranchInfo").textContent = b
      ? `${b.TenChiNhanh} · ${b.TrangThai}`
      : "";
    this.hr = null;
    this.weekStart ||= UI.monday(UI.today());
    YModule.reset();
    TrucModule.reset();
    LinhModule.reset();
    for (const id of [
      "scheduleTableBody",
      "staffTableBody",
      "attendanceTableBody",
      "scheduleCalendar",
      "scheduleStaffChoices",
      "hrSummary",
    ])
      UI.el(id).innerHTML = "";
    this.resetSchedule();
    this.resetStaff();
    await this.refresh();
  },
  async refresh() {
    if (!this.user || !this.currentBranchId) return;
    const epoch = ++this.epoch,
      b = this.currentBranchId;
    const tasks = [
      [
        "hr",
        `/hr?branchId=${b}&from=${this.weekStart}&to=${UI.addDays(this.weekStart, 6)}`,
      ],
    ];
    if (this.user.Role !== "STAFF") tasks.push(["kds", `/kds?branchId=${b}`]);
    if (this.isSeller)
      tasks.push(
        ["shift", `/shifts?branchId=${b}`],
        ["catalog", `/orders/pos-init?branchId=${b}`],
        ["orders", `/orders?branchId=${b}`],
      );
    if (this.isManager)
      tasks.push(
        [
          "menu",
          `/products?page=${LinhModule.productPage}&limit=12&search=${encodeURIComponent(LinhModule.search)}`,
        ],
        ["toppings", "/products/toppings"],
        ["promos", "/promos"],
        ["customers", `/promos/customers?branchId=${b}`],
      );
    const results = await Promise.allSettled(
      tasks.map(([, u]) => ApiClient.get(u)),
    );
    if (epoch !== this.epoch || !this.user) return;
    const errors = [];
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        errors.push(r.reason.message);
        return;
      }
      const d = r.value,
        name = tasks[i][0];
      if (name === "hr") {
        this.hr = d;
        this.renderHR();
      } else if (name === "kds") TrucModule.hydrateKds(d.data);
      else if (name === "shift") YModule.hydrate(d);
      else if (name === "catalog")
        TrucModule.hydrateProducts(d.products, d.toppings, d.vouchers);
      else if (name === "orders") TrucModule.hydrateOrders(d.orders);
      else if (name === "menu") LinhModule.hydrateProducts(d);
      else if (name === "toppings") LinhModule.hydrateToppings(d.toppings);
      else if (name === "promos") YModule.hydratePromos(d.promos);
      else if (name === "customers") YModule.hydrateCustomers(d.customers);
    });
    this.applyRoles();
    if (errors.length) throw new Error([...new Set(errors)].join(" "));
  },
  switchTab(tab) {
    const button = document.querySelector(`[data-tab="${tab}"]`);
    if (!button || button.hidden) return;
    document
      .querySelectorAll(".tab-pane")
      .forEach((e) => e.classList.toggle("active", e.id === `tab-${tab}`));
    document
      .querySelectorAll("[data-tab]")
      .forEach((e) => e.classList.toggle("active", e.dataset.tab === tab));
  },
  renderBranches() {
    UI.el("branchTableBody").innerHTML =
      this.branches
        .map(
          (b) =>
            `<tr><td>#${b.MaChiNhanh}</td><td>${UI.escape(b.TenChiNhanh)}<br>${UI.escape(b.SoDienThoai)}</td><td>${UI.escape(b.DiaChi)}</td><td>${this.user.Role === "ADMIN" ? `<select aria-label="Trạng thái chi nhánh" onchange="UI.run(this,()=>ManhModule.setBranchStatus(${b.MaChiNhanh},this.value))">${["open", "busy", "closed"].map((s) => `<option ${b.TrangThai === s ? "selected" : ""}>${s}</option>`).join("")}</select>` : UI.escape(b.TrangThai)}</td></tr>`,
        )
        .join("") || UI.empty(4);
  },
  async createBranch() {
    const r = await ApiClient.post("/branches", {
      action: "create",
      TenChiNhanh: UI.value("branchName"),
      DiaChi: UI.value("branchAddress"),
      SoDienThoai: UI.value("branchPhone"),
    });
    UI.notify(r.message);
    for (const id of ["branchName", "branchPhone", "branchAddress"])
      UI.el(id).value = "";
    await this.loadBranches(r.branch.MaChiNhanh);
  },
  async setBranchStatus(id, status) {
    try {
      const r = await ApiClient.post("/branches", {
        action: "status",
        MaChiNhanh: id,
        TrangThai: status,
      });
      UI.notify(r.message);
    } finally {
      await this.loadBranches();
    }
  },
  async setWeek(date) {
    this.weekStart = UI.monday(date);
    await this.refresh();
  },
  async shiftWeek(delta) {
    await this.setWeek(UI.addDays(this.weekStart, delta * 7));
  },
  renderHR() {
    const d = this.hr;
    if (!d) return;
    const active = d.nhanVien.filter((n) => n.TrangThai === "active"),
      selected = [
        ...UI.el("scheduleStaffChoices").querySelectorAll("input:checked"),
      ].map((e) => Number(e.value));
    UI.el("weekDate").value = this.weekStart;
    UI.el("copyWeekTarget").value = UI.addDays(this.weekStart, 7);
    UI.el("calendarTitle").textContent =
      `Lịch ${this.weekStart} → ${UI.addDays(this.weekStart, 6)}`;
    UI.el("scheduleStaffChoices").innerHTML =
      active
        .map(
          (n) =>
            `<label class="employee-choice"><input type="checkbox" value="${n.MaNhanVien}" ${selected.includes(n.MaNhanVien) ? "checked" : ""}><span>${UI.escape(n.HoTen)}<small>${UI.escape(n.TenVaiTro)}</small></span></label>`,
        )
        .join("") || '<p class="muted">Chưa có nhân viên đang làm việc.</p>';
    for (const id of ["attendanceStaffSelect", "calendarEmployee"]) {
      const value = UI.el(id).value;
      UI.el(id).innerHTML =
        (id === "calendarEmployee"
          ? '<option value="">Tất cả nhân viên</option>'
          : "") + UI.options(active, "MaNhanVien", "HoTen");
      if (active.some((n) => String(n.MaNhanVien) === value))
        UI.el(id).value = value;
    }
    const template = UI.el("scheduleTemplate").value;
    UI.el("scheduleTemplate").innerHTML =
      '<option value="">Tùy chỉnh giờ</option>' +
      d.caMau
        .map(
          (c) =>
            `<option value="${c.MaCaMau}">${UI.escape(c.TenCa)} · ${c.GioBatDau}–${c.GioKetThuc}${c.QuaDem ? " (+1 ngày)" : ""}</option>`,
        )
        .join("");
    if (d.caMau.some((c) => String(c.MaCaMau) === template))
      UI.el("scheduleTemplate").value = template;
    const planned = d.phanCa.filter((s) =>
        activeStatuses.includes(s.TrangThai),
      ),
      hours = planned.reduce(
        (sum, s) =>
          sum + (new Date(s.KetThucLam) - new Date(s.BatDauLam)) / 3600000,
        0,
      ),
      assigned = new Set(planned.map((s) => s.MaNhanVien));
    UI.el("hrSummary").innerHTML = [
      [active.length, "Nhân viên đang làm"],
      [planned.length, "Ca trong tuần"],
      [UI.money(hours), "Giờ đã phân công"],
      [
        active.filter((n) => !assigned.has(n.MaNhanVien)).length,
        "Nhân viên chưa có ca",
      ],
    ]
      .map(
        ([n, label]) =>
          `<div class="stat-card"><strong>${n}</strong><span>${label}</span></div>`,
      )
      .join("");
    UI.el("scheduleRules").textContent =
      `Tối đa ${d.limits.shift} giờ/ca, ${d.limits.day} giờ/ngày, ${d.limits.week} giờ/tuần. Các ca không được chồng giờ.`;
    UI.el("staffTableBody").innerHTML =
      d.nhanVien
        .map(
          (n) =>
            `<tr><td>#${n.MaNhanVien}</td><td>${UI.escape(n.HoTen)}</td><td>${UI.escape(n.SoDienThoai)}</td><td>${UI.escape(n.TenVaiTro)}</td><td>${n.TrangThai === "active" ? "Đang làm" : "Ngừng làm"}</td><td>${this.isManager && (this.user.Role === "ADMIN" || ["CASHIER", "BARISTA", "STAFF"].includes(n.Role)) ? `<button class="btn small-btn" onclick="ManhModule.editStaff(${n.MaNhanVien})">Sửa</button>` : ""}</td></tr>`,
        )
        .join("") || UI.empty(6);
    UI.el("attendanceTableBody").innerHTML =
      d.chamCong
        .map(
          (a) =>
            `<tr><td>${UI.escape(a.HoTen)}<br><small>${UI.escape(a.ViTriLamViec)}</small></td><td>${UI.date(a.ThoiGianCheckIn)}<br>${UI.date(a.ThoiGianCheckOut)}</td><td>${a.SoGioLamThucTe == null ? "Đang làm" : UI.money(a.SoGioLamThucTe)}</td><td>${a.SoPhutDiTre || 0} / ${a.SoPhutVeSom || 0} phút</td></tr>`,
        )
        .join("") || UI.empty(4);
    this.renderCalendar();
  },
  scheduleActions(s) {
    const own = s.MaNhanVien === this.user.MaNhanVien,
      manager = this.isManager;
    let buttons = "";
    if (manager && s.TrangThai === "scheduled")
      buttons += `<button class="btn small-btn" onclick="ManhModule.editSchedule(${s.MaPhanCa})">Sửa</button>`;
    if (manager && activeStatuses.includes(s.TrangThai))
      buttons += `<button class="btn btn-red small-btn" onclick="UI.run(this,()=>ManhModule.cancelSchedule(${s.MaPhanCa}))">Hủy</button>`;
    if (
      (own || this.user.Role === "ADMIN") &&
      s.TrangThai === "scheduled" &&
      new Date(s.KetThucLam) > new Date()
    )
      buttons += `<button class="btn small-btn" onclick="UI.run(this,()=>ManhModule.leave(${s.MaPhanCa},'request_leave'))">Xin nghỉ</button>`;
    if (manager && s.TrangThai === "Leave_Requested")
      buttons += `<button class="btn btn-green small-btn" onclick="UI.run(this,()=>ManhModule.leave(${s.MaPhanCa},'approve_leave'))">Duyệt</button><button class="btn small-btn" onclick="UI.run(this,()=>ManhModule.leave(${s.MaPhanCa},'reject_leave'))">Từ chối</button>`;
    return buttons;
  },
  renderCalendar() {
    if (!this.hr) return;
    const employee = Number(UI.value("calendarEmployee")) || null,
      position = UI.value("calendarPosition"),
      days = Array.from({ length: 7 }, (_, i) => UI.addDays(this.weekStart, i)),
      rows = this.hr.phanCa.filter(
        (s) =>
          (!employee || s.MaNhanVien === employee) &&
          (!position || s.ViTriLamViec === position),
      );
    const staff = this.hr.nhanVien.filter(
      (n) =>
        (!employee || n.MaNhanVien === employee) &&
        (n.TrangThai === "active" ||
          rows.some((s) => s.MaNhanVien === n.MaNhanVien)),
    );
    const header =
      "<thead><tr><th>Nhân viên</th>" +
      days
        .map(
          (d, i) =>
            `<th>${["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"][i]}<br>${d.slice(8, 10)}/${d.slice(5, 7)}</th>`,
        )
        .join("") +
      "</tr></thead>";
    UI.el("scheduleCalendar").innerHTML =
      header +
      "<tbody>" +
      staff
        .map((n) => {
          const total = rows
            .filter(
              (s) =>
                s.MaNhanVien === n.MaNhanVien &&
                activeStatuses.includes(s.TrangThai),
            )
            .reduce(
              (sum, s) =>
                sum +
                (new Date(s.KetThucLam) - new Date(s.BatDauLam)) / 3600000,
              0,
            );
          return (
            `<tr><td class="calendar-employee">${UI.escape(n.HoTen)}<small>${UI.escape(n.TenVaiTro)} · ${UI.money(total)} giờ</small></td>` +
            days
              .map((day) => {
                const start = new Date(day + "T00:00:00+07:00"),
                  end = new Date(start.getTime() + 86400000);
                const shifts = rows.filter(
                  (s) =>
                    s.MaNhanVien === n.MaNhanVien &&
                    new Date(s.BatDauLam) < end &&
                    new Date(s.KetThucLam) > start,
                );
                return (
                  "<td>" +
                  shifts
                    .map(
                      (s) =>
                        `<div class="shift-card ${UI.escape(s.TrangThai)}"><strong>${UI.clock(s.BatDauLam)}–${UI.clock(s.KetThucLam)}${UI.isoDay(s.BatDauLam) !== UI.isoDay(s.KetThucLam) ? " (+1 ngày)" : ""}</strong><span class="position-tag">${UI.escape(s.ViTriLamViec)}</span><br><small>${UI.escape({ scheduled: "Đã xếp", Leave_Requested: "Xin nghỉ", Absent: "Đã duyệt nghỉ", cancelled: "Đã hủy" }[s.TrangThai])}</small><div>${this.scheduleActions(s)}</div></div>`,
                    )
                    .join("") +
                  (this.isManager
                    ? `<button class="cell-add" onclick="ManhModule.prefillSchedule(${n.MaNhanVien},'${day}')">+ Ca</button>`
                    : "") +
                  "</td>"
                );
              })
              .join("") +
            "</tr>"
          );
        })
        .join("") +
      "</tbody>";
    UI.el("scheduleTableBody").innerHTML =
      rows
        .map(
          (s) =>
            `<tr><td>${UI.escape(s.HoTen)}</td><td>${UI.date(s.BatDauLam)} → ${UI.date(s.KetThucLam)}</td><td>${UI.escape(s.ViTriLamViec)}</td><td>${UI.escape(s.TrangThai)}<br>${UI.escape(s.GhiChu)} ${UI.escape(s.LyDoNghi || s.LyDoHuy)}</td><td>${this.scheduleActions(s)}</td></tr>`,
        )
        .join("") || UI.empty(5);
  },
  resetSchedule() {
    UI.el("editScheduleId").value = "";
    UI.el("scheduleFormTitle").textContent = "Phân ca làm việc";
    UI.el("scheduleDate").value =
      this.weekStart &&
      UI.today() >= this.weekStart &&
      UI.today() <= UI.addDays(this.weekStart, 6)
        ? UI.today()
        : this.weekStart || UI.today();
    UI.el("scheduleStart").value = "06:00";
    UI.el("scheduleEnd").value = "12:00";
    UI.el("scheduleOvernight").checked = false;
    UI.el("scheduleNote").value = "";
    UI.el("scheduleTemplate").value = "";
    UI.el("scheduleStaffChoices")
      .querySelectorAll("input")
      .forEach((e) => (e.checked = false));
  },
  prefillSchedule(employee, date) {
    this.resetSchedule();
    UI.el("scheduleDate").value = date;
    const box = UI.el("scheduleStaffChoices").querySelector(
      `input[value="${employee}"]`,
    );
    if (box) box.checked = true;
    UI.el("scheduleEditor").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  },
  useTemplate() {
    const t = this.hr?.caMau.find(
      (t) => String(t.MaCaMau) === UI.value("scheduleTemplate"),
    );
    if (t) {
      UI.el("scheduleStart").value = t.GioBatDau;
      UI.el("scheduleEnd").value = t.GioKetThuc;
      UI.el("scheduleOvernight").checked = !!t.QuaDem;
    }
  },
  customTime() {
    UI.el("scheduleTemplate").value = "";
  },
  editSchedule(id) {
    const s = this.hr.phanCa.find((s) => s.MaPhanCa === id);
    this.prefillSchedule(s.MaNhanVien, UI.isoDay(s.BatDauLam));
    UI.el("editScheduleId").value = id;
    UI.el("scheduleFormTitle").textContent = `Sửa ca #${id}`;
    UI.el("scheduleStart").value = UI.clock(s.BatDauLam);
    UI.el("scheduleEnd").value = UI.clock(s.KetThucLam);
    UI.el("scheduleOvernight").checked =
      UI.isoDay(s.BatDauLam) !== UI.isoDay(s.KetThucLam);
    UI.el("schedulePosition").value = s.ViTriLamViec;
    UI.el("scheduleTemplate").value = s.MaCaMau || "";
    UI.el("scheduleNote").value = s.GhiChu || "";
  },
  async hrAction(data) {
    const r = await ApiClient.post("/hr", {
      ...data,
      MaChiNhanh: this.currentBranchId,
    });
    UI.notify(r.message);
    await this.refresh();
    return r;
  },
  async saveSchedule() {
    const date = UI.value("scheduleDate");
    await this.hrAction({
      action: UI.value("editScheduleId") ? "update_shift" : "assign_shift",
      MaPhanCa: UI.value("editScheduleId"),
      NhanVienIds: [
        ...UI.el("scheduleStaffChoices").querySelectorAll("input:checked"),
      ].map((e) => Number(e.value)),
      NgayLamViec: date,
      GioBatDau: UI.value("scheduleStart"),
      GioKetThuc: UI.value("scheduleEnd"),
      QuaDem: UI.el("scheduleOvernight").checked,
      ViTriLamViec: UI.value("schedulePosition"),
      MaCaMau: UI.value("scheduleTemplate"),
      GhiChu: UI.value("scheduleNote"),
    });
    if (UI.monday(date) !== this.weekStart) await this.setWeek(date);
    this.resetSchedule();
  },
  async cancelSchedule(id) {
    const reason = prompt("Lý do hủy ca:");
    if (reason === null) return;
    await this.hrAction({
      action: "cancel_shift",
      MaPhanCa: id,
      LyDoHuy: reason,
    });
  },
  async leave(id, action) {
    const reason = action === "request_leave" ? prompt("Lý do xin nghỉ:") : "";
    if (reason === null) return;
    await this.hrAction({ action, MaPhanCa: id, LyDoXinNghi: reason });
  },
  async copyWeek() {
    const target = UI.monday(UI.value("copyWeekTarget"));
    await this.hrAction({
      action: "copy_week",
      TuTuan: this.weekStart,
      DenTuan: target,
    });
    await this.setWeek(target);
  },
  attendance(action) {
    return this.hrAction({
      action,
      MaNhanVien: UI.value("attendanceStaffSelect"),
    });
  },
  resetStaff() {
    for (const id of ["editStaffId", "staffName", "staffPhone", "staffPin"])
      UI.el(id).value = "";
    UI.el("staffWage").value = 25000;
    UI.el("staffRole").value = "CASHIER";
    UI.el("staffStatus").value = "active";
    UI.el("staffFormTitle").textContent = "Nhân viên của chi nhánh";
  },
  editStaff(id) {
    const n = this.hr.nhanVien.find((n) => n.MaNhanVien === id);
    UI.el("editStaffId").value = id;
    UI.el("staffName").value = n.HoTen;
    UI.el("staffPhone").value = n.SoDienThoai;
    UI.el("staffPin").value = "";
    UI.el("staffRole").value = n.Role;
    UI.el("staffWage").value = n.LuongTheoGio;
    UI.el("staffStatus").value = n.TrangThai;
    UI.el("staffFormTitle").textContent = `Sửa ${n.HoTen}`;
    UI.el("staffFormTitle").scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  },
  async saveStaff() {
    await this.hrAction({
      action: UI.value("editStaffId") ? "update_staff" : "create_staff",
      MaNhanVien: UI.value("editStaffId"),
      HoTen: UI.value("staffName"),
      SoDienThoai: UI.value("staffPhone"),
      MaPIN: UI.value("staffPin"),
      Role: UI.value("staffRole"),
      LuongTheoGio: UI.value("staffWage"),
      TrangThai: UI.value("staffStatus"),
    });
    this.resetStaff();
  },
  async logout() {
    await ApiClient.post("/auth/logout", {});
    this.showLogin();
    UI.notify("Đã đăng xuất.");
  },
  async changePin() {
    const old = prompt("PIN hiện tại:");
    if (old === null) return;
    const next = prompt("PIN mới (6–12 chữ số):");
    if (next === null) return;
    const r = await ApiClient.post("/auth/pin", { OldPIN: old, NewPIN: next });
    this.showLogin();
    UI.notify(r.message);
  },
  async loadReport() {
    const branch = this.currentBranchId,
      d = await ApiClient.get(
        `/reports?branchId=${branch}&from=${UI.value("reportFrom")}&to=${UI.value("reportTo")}`,
      );
    if (branch !== this.currentBranchId) return;
    UI.el("reportSummary").innerHTML =
      `<div class="report-stats"><p>Số đơn<strong>${d.summary.SoDon}</strong></p><p>Doanh thu đơn đã trả<strong>${UI.money(d.summary.DoanhThu)}đ</strong></p><p>Giá trị đơn hoàn<strong>${UI.money(d.summary.TienHoan)}đ</strong></p><p>Đơn hủy<strong>${d.summary.DonHuy}</strong></p></div>`;
    UI.el("reportProducts").innerHTML =
      d.topProducts
        .map(
          (p) =>
            `<tr><td>${UI.escape(p.TenSanPhamLuuTru)}</td><td>${p.SoLuong}</td><td>${UI.money(p.TienHang)}</td></tr>`,
        )
        .join("") || UI.empty(3);
    UI.el("reportMethods").innerHTML =
      d.paymentMethods
        .map(
          (p) =>
            `<tr><td>${UI.escape(p.PhuongThuc)}</td><td>${UI.money(p.ThuRong)}</td></tr>`,
        )
        .join("") || UI.empty(2);
  },
};
export { ManhModule };
