import { ApiClient, UI } from "../services/api.js";
import { ManhModule } from "./manhBranchHr.js";
/* Ý: ca POS, phiếu thu chi, đối soát và Voucher/CRM. */
const YModule = {
  activeShift: null,
  theoreticalMoney: 0,
  reset() {
    this.activeShift = null;
    this.theoreticalMoney = 0;
    UI.el("theoreticalCash").value = 0;
    UI.el("globalShiftBadge").textContent = "Chưa xác định trạng thái ca";
    UI.el("globalShiftBadge").className = "shift-badge shift-closed";
    UI.el("cashflowTableBody").innerHTML = "";
    UI.el("shiftHistoryBody").innerHTML = "";
    UI.el("shiftSummary").textContent = "";
    UI.el("shiftReconcileResult").textContent = "";
  },
  hydrate(data) {
    this.activeShift = data.activeShift;
    this.theoreticalMoney = Number(data.theoreticalCash);
    const badge = UI.el("globalShiftBadge");
    badge.textContent = this.activeShift
      ? `Ca #${this.activeShift.MaPhienCa} · ${this.activeShift.TenThuNgan}`
      : "Chưa mở ca POS";
    badge.className =
      "shift-badge " + (this.activeShift ? "shift-open" : "shift-closed");
    UI.el("theoreticalCash").value = this.theoreticalMoney;
    UI.el("shiftSummary").textContent = this.activeShift
      ? `Đầu ca: ${UI.money(this.activeShift.TienMatDauCa)}đ · Thu tiền mặt: ${UI.money(this.activeShift.TongThuTienMat)}đ · Hoàn tiền mặt: ${UI.money(this.activeShift.TongHoanTienMat)}đ`
      : "Mở ca trước khi bán hàng hoặc lập phiếu.";
    UI.el("cashflowTableBody").innerHTML =
      data.cashflows
        .map(
          (p) =>
            `<tr><td>${UI.escape(p.LoaiPhieu)}</td><td>${UI.money(p.SoTien)}</td><td>${UI.escape(p.LyDo)}</td><td>${UI.escape(p.TenNguoiTao)}</td></tr>`,
        )
        .join("") || UI.empty(4);
    UI.el("shiftHistoryBody").innerHTML =
      data.historyShifts
        .map(
          (s) =>
            `<tr><td>#${s.MaPhienCa}</td><td>${UI.escape(s.TenThuNgan)}</td><td>${UI.date(s.ThoiGianMo)}<br>${UI.date(s.ThoiGianDong)}</td><td>${UI.escape(s.TrangThai)}</td><td>${UI.money(s.TienMatDauCa)}</td><td>${s.TienMatThucTeCuoiCa == null ? "—" : UI.money(s.TienMatThucTeCuoiCa)}</td><td>${s.TienChenhLech == null ? "—" : UI.money(s.TienChenhLech)}</td></tr>`,
        )
        .join("") || UI.empty(7);
  },
  requireShift() {
    if (!this.activeShift)
      throw new Error("Vui lòng mở ca POS tại chi nhánh đang chọn.");
    return this.activeShift.MaPhienCa;
  },
  async openShift() {
    const r = await ApiClient.post("/shifts/open", {
      MaChiNhanh: ManhModule.currentBranchId,
      TienMatDauCa: UI.value("openShiftMoney"),
      LyDoLechDauCa: UI.value("openShiftReason"),
    });
    UI.notify(r.message);
    await ManhModule.refresh();
  },
  async createCashflow() {
    const r = await ApiClient.post("/shifts/cashflow", {
      MaPhienCa: this.requireShift(),
      LoaiPhieu: UI.value("cashflowType"),
      SoTien: UI.value("cashflowAmount"),
      LyDo: UI.value("cashflowReason"),
    });
    UI.el("cashflowAmount").value = "";
    UI.el("cashflowReason").value = "";
    UI.notify(r.message);
    await ManhModule.refresh();
  },
  async closeShift() {
    const r = await ApiClient.post("/shifts/close", {
      MaPhienCa: this.requireShift(),
      TienMatThucTeCuoiCa: UI.value("actualCash"),
      LyDoChenhLechCuoiCa: UI.value("closeShiftReason"),
    });
    await ManhModule.refresh();
    UI.el("shiftReconcileResult").textContent =
      `Lý thuyết ${UI.money(r.theoreticalCash)}đ · Thực đếm ${UI.money(r.actualCash)}đ · Chênh lệch ${UI.money(r.difference)}đ`;
    UI.notify(r.message);
    UI.el("actualCash").value = "";
  },
  async createPromo() {
    const start = UI.value("promoStart"),
      end = UI.value("promoEnd");
    if (!start || !end)
      throw new Error("Vui lòng chọn ngày bắt đầu và kết thúc.");
    const r = await ApiClient.post("/promos", {
      MaCode: UI.value("promoCodeInput"),
      TenChuongTrinh: UI.value("promoName"),
      LoaiKhuyenMai: UI.value("promoType"),
      GiaTriGiam: UI.value("promoValue"),
      DonToiThieu: UI.value("promoMin"),
      GiamToiDa: UI.value("promoMax"),
      MaChiNhanh: UI.value("promoBranch"),
      GioiHanLuotDung: UI.value("promoLimit"),
      NgayBatDau: new Date(start).toISOString(),
      NgayKetThuc: new Date(end).toISOString(),
    });
    UI.notify(r.message);
    await ManhModule.refresh();
  },
  hydratePromos(rows) {
    const selected = UI.el("promoBranch").value;
    UI.el("promoBranch").innerHTML =
      (ManhModule.user.Role === "ADMIN"
        ? '<option value="">Toàn chuỗi</option>'
        : "") + UI.options(ManhModule.branches, "MaChiNhanh", "TenChiNhanh");
    if (ManhModule.user.Role !== "ADMIN")
      UI.el("promoBranch").value = ManhModule.currentBranchId;
    else if (ManhModule.branches.some((b) => String(b.MaChiNhanh) === selected))
      UI.el("promoBranch").value = selected;
    UI.el("promoTableBody").innerHTML =
      rows
        .map(
          (p) =>
            `<tr><td><b>${UI.escape(p.MaCode)}</b><br>${UI.escape(p.TenChuongTrinh)}</td><td>${UI.money(p.GiaTriGiam)}${p.LoaiKhuyenMai === "PERCENT" ? "%" : "đ"}<br>Từ ${UI.money(p.DonToiThieu)}đ${p.GiamToiDa ? `<br>Tối đa ${UI.money(p.GiamToiDa)}đ` : ""}</td><td>${UI.escape(p.TenChiNhanh || "Toàn chuỗi")}<br>${UI.date(p.NgayKetThuc)}</td><td>${p.SoLuotDaDung || 0} / ${p.GioiHanLuotDung ?? "∞"}</td><td>${UI.escape(p.TrangThai)}</td><td><button class="btn small-btn" onclick="UI.run(this,()=>YModule.togglePromo(${p.MaKhuyenMai},'${p.TrangThai === "active" ? "inactive" : "active"}'))">${p.TrangThai === "active" ? "Tắt" : "Bật"}</button></td></tr>`,
        )
        .join("") || UI.empty(6);
  },
  async togglePromo(id, status) {
    const r = await ApiClient.put(`/promos/${id}/status`, {
      TrangThai: status,
    });
    UI.notify(r.message);
    await ManhModule.refresh();
  },
  hydrateCustomers(rows) {
    UI.el("customerTableBody").innerHTML =
      rows
        .map(
          (c) =>
            `<tr><td>${UI.escape(c.HoTen)}</td><td>${UI.escape(c.SoDienThoai)}</td><td>${c.DiemTichLuy}</td><td>${UI.money(c.TongChiTieu)}</td><td>${UI.escape(c.HangThanhVien)}</td></tr>`,
        )
        .join("") || UI.empty(5);
  },
};

export { YModule };
