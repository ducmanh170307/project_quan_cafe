// Test double thay tầng SQL; các model thật vẫn chạy quy tắc giao dịch/giá/voucher/lịch.
function memoryDB(t, db, products) {
  let state = {
    branches: [
      { MaChiNhanh: 1, TrangThai: "open" },
      { MaChiNhanh: 2, TrangThai: "open" },
    ],
    shifts: [
      {
        MaPhienCa: 1,
        MaChiNhanh: 1,
        TrangThai: "open",
        TienMatDauCa: 1000000,
        TongThuTienMat: 0,
        TongHoanTienMat: 0,
        TongThuNoiBo: 0,
        TongChiNoiBo: 0,
      },
    ],
    orders: [],
    lines: [],
    toppingLines: [],
    payments: [],
    customers: [],
    promos: [],
    employees: [
      { MaNhanVien: 2, MaChiNhanh: 1, HoTen: "Lan", TrangThai: "active" },
      { MaNhanVien: 3, MaChiNhanh: 1, HoTen: "Ý", TrangThai: "active" },
      { MaNhanVien: 4, MaChiNhanh: 2, HoTen: "Hà", TrangThai: "active" },
    ],
    schedules: [],
    attendance: [],
  };
  let tail = Promise.resolve();
  const rows = (x) => ({ recordset: structuredClone(x) }),
    order = (id) => state.orders.find((x) => x.MaDonHang === id),
    shift = (id) => state.shifts.find((x) => x.MaPhienCa === id);
  const query = async (s, p = {}) => {
    if (s.includes("lock:branch"))
      return rows(state.branches.filter((x) => x.MaChiNhanh === p.id));
    if (s.includes("lock:shift"))
      return rows(state.shifts.filter((x) => x.MaPhienCa === p.id));
    if (s.includes("order:duplicate"))
      return rows(state.orders.filter((x) => x.IdempotencyKey === p.key));
    if (s.includes("order:insert")) {
      const o = {
        MaDonHang: state.orders.length + 1,
        MaChiNhanh: p.branch,
        MaNhanVienTao: p.actor,
        MaKhachHang: p.customerId,
        MaKhuyenMai: p.promoId,
        MaPhienCa: null,
        IdempotencyKey: p.key,
        YeuCauHash: p.fingerprint,
        MaDonHienThi: p.code,
        TongTienHang: p.subtotal,
        TienGiamGia: p.discount,
        TongPhaiTra: p.total,
        TrangThaiThanhToan: "unpaid",
        TrangThaiDonHang: "Pending_Payment",
        DiemDaCong: 0,
      };
      state.orders.push(o);
      return rows([o]);
    }
    if (s.includes("order:receipt"))
      return rows(
        state.orders
          .filter((o) => o.MaDonHang === p.id)
          .map((o) => ({
            ...o,
            TienThua:
              state.payments.find(
                (y) => y.MaDonHang === p.id && y.LoaiGiaoDich === "PAYMENT",
              )?.TienThuaTraKhach || 0,
          })),
      );
    if (s.startsWith("UPDATE DonHang SET SoThuTuGoiMon")) {
      order(p.id).SoThuTuGoiMon = p.id;
      return rows([]);
    }
    if (s.includes("order:line")) {
      const l = {
        MaChiTietDon: state.lines.length + 1,
        MaDonHang: p.id,
        MaSanPham: p.product,
        TenSize: p.size,
        SoLuong: p.qty,
        DonGiaBan: p.price,
        SoLanLamLai: 0,
      };
      state.lines.push(l);
      return rows([l]);
    }
    if (s.includes("order:topping")) {
      state.toppingLines.push(p);
      return rows([]);
    }
    if (s.includes("order:repricing")) {
      Object.assign(order(p.id), {
        MaKhuyenMai: p.promo,
        TienGiamGia: p.discount,
        TongPhaiTra: p.total,
      });
      return rows([]);
    }
    if (s.includes("order:payment")) {
      state.payments.push({
        MaDonHang: p.id,
        PhuongThuc: p.method,
        LoaiGiaoDich: "PAYMENT",
        SoTienThanhToan: p.total,
        TienThuaTraKhach: p.change,
      });
      Object.assign(order(p.id), {
        MaPhienCa: p.shift,
        TrangThaiThanhToan: "paid",
        TrangThaiDonHang: "Preparing",
      });
      return rows([]);
    }
    if (s.startsWith("UPDATE PhienLamViecPOS SET TongThuTienMat")) {
      shift(p.shift).TongThuTienMat += p.total;
      return rows([]);
    }
    if (s.startsWith("UPDATE PhienLamViecPOS SET TongHoanTienMat")) {
      shift(p.shift).TongHoanTienMat += p.total;
      return rows([]);
    }
    if (s.startsWith("SELECT MaChiNhanh FROM DonHang"))
      return rows(
        state.orders
          .filter((o) => o.MaDonHang === p.id)
          .map((o) => ({ MaChiNhanh: o.MaChiNhanh })),
      );
    if (s.startsWith("SELECT MaChiNhanh FROM PhienLamViecPOS"))
      return rows(
        state.shifts
          .filter((o) => o.MaPhienCa === p.id)
          .map((o) => ({ MaChiNhanh: o.MaChiNhanh })),
      );
    if (
      s.includes("order:refund-lock") ||
      s.startsWith("SELECT * FROM DonHang")
    )
      return rows(state.orders.filter((o) => o.MaDonHang === p.id));
    if (s.startsWith("SELECT * FROM GiaoDichThanhToan"))
      return rows(
        state.payments.filter(
          (x) => x.MaDonHang === p.id && x.LoaiGiaoDich === "PAYMENT",
        ),
      );
    if (s.startsWith("INSERT INTO GiaoDichThanhToan")) {
      state.payments.push({
        MaDonHang: p.id,
        PhuongThuc: p.method,
        LoaiGiaoDich: "REFUND",
        SoTienThanhToan: p.total,
      });
      return rows([]);
    }
    if (s.startsWith("UPDATE DonHang SET TrangThaiDonHang='Cancelled'")) {
      const o = order(p.id);
      if (o.TrangThaiThanhToan === "paid") o.TrangThaiThanhToan = "refunded";
      o.TrangThaiDonHang = "Cancelled";
      return rows([]);
    }
    if (s.includes("shift:pending"))
      return rows([
        {
          Total: state.orders.filter(
            (o) =>
              o.MaPhienCa === p.id &&
              !["Completed", "Cancelled"].includes(o.TrangThaiDonHang),
          ).length,
        },
      ]);
    if (s.startsWith("UPDATE PhienLamViecPOS SET ThoiGianDong")) {
      Object.assign(shift(p.id), {
        TrangThai: "closed",
        TienMatThucTeCuoiCa: p.actual,
        TienChenhLech: p.difference,
      });
      return rows([]);
    }
    if (s.startsWith("UPDATE ChiTietDonHang SET TrangThaiPhaChe='Done'")) {
      order(p.id).TrangThaiDonHang = "Completed";
      return rows([]);
    }
    if (s.startsWith("SELECT * FROM ChiTietDonHang"))
      return rows(
        state.lines.filter(
          (l) => l.MaDonHang === p.id && l.MaChiTietDon === p.lineId,
        ),
      );
    if (s.startsWith("UPDATE ChiTietDonHang SET SoLanLamLai")) {
      state.lines.find((l) => l.MaChiTietDon === p.lineId).SoLanLamLai += p.qty;
      return rows([]);
    }
    if (s.startsWith("SELECT * FROM ChuongTrinhKhuyenMai"))
      return rows(
        state.promos.filter((v) =>
          p.code ? v.MaCode === p.code : v.MaKhuyenMai === p.id,
        ),
      );
    if (s.includes("voucher:claim")) {
      const v = state.promos.find((v) => v.MaKhuyenMai === p.id);
      if (
        !v ||
        v.TrangThai !== "active" ||
        (v.GioiHanLuotDung != null && v.SoLuotDaDung >= v.GioiHanLuotDung)
      )
        return rows([]);
      v.SoLuotDaDung++;
      return rows([{ MaKhuyenMai: v.MaKhuyenMai }]);
    }
    if (s.startsWith("SELECT MaKhachHang FROM KhachHang"))
      return rows(state.customers.filter((c) => c.SoDienThoai === p.phone));
    if (s.startsWith("INSERT INTO KhachHang")) {
      const c = {
        MaKhachHang: state.customers.length + 1,
        SoDienThoai: p.phone,
        HoTen: p.name,
        DiemTichLuy: 0,
        TongChiTieu: 0,
      };
      state.customers.push(c);
      return rows([c]);
    }
    if (s.startsWith("UPDATE KhachHang SET DiemTichLuy")) {
      const c = state.customers.find((c) => c.MaKhachHang === p.id);
      c.DiemTichLuy = Math.max(0, c.DiemTichLuy + p.points);
      c.TongChiTieu = Math.max(0, c.TongChiTieu + p.money);
      return rows([]);
    }
    if (s.startsWith("UPDATE DonHang SET DiemDaCong")) {
      order(p.id).DiemDaCong = p.points;
      return rows([]);
    }
    if (s.includes("hr:employee"))
      return rows(
        state.employees.filter(
          (e) =>
            e.MaNhanVien === p.employee &&
            e.MaChiNhanh === p.branch &&
            e.TrangThai === "active",
        ),
      );
    if (s.includes("hr:existing"))
      return rows(
        state.schedules.filter(
          (x) =>
            x.MaNhanVien === p.employee &&
            new Date(x.BatDauLam) < p.end &&
            new Date(x.KetThucLam) > p.start &&
            ["scheduled", "Leave_Requested"].includes(x.TrangThai),
        ),
      );
    if (s.includes("hr:insert") || s.includes("hr:update")) {
      const values = {
        MaPhanCa:
          p.id || Math.max(0, ...state.schedules.map((s) => s.MaPhanCa)) + 1,
        MaChiNhanh: p.branch,
        MaNhanVien: p.employee,
        NgayLamViec: p.date,
        BatDauLam: p.begins,
        KetThucLam: p.ends,
        ViTriLamViec: p.position,
        GhiChu: p.note,
        TrangThai: "scheduled",
      };
      if (p.id)
        Object.assign(
          state.schedules.find((x) => x.MaPhanCa === p.id),
          values,
        );
      else state.schedules.push(values);
      return rows([values]);
    }
    if (s.startsWith("SELECT * FROM LichPhanCa WITH"))
      return rows(
        state.schedules.filter(
          (x) => x.MaPhanCa === p.id && x.MaChiNhanh === p.branch,
        ),
      );
    if (s.startsWith("SELECT MaChamCong FROM BangChamCong"))
      return rows(
        state.attendance.filter((a) => a.MaPhanCa === (p.id || p.shift)),
      );
    if (s.startsWith("UPDATE LichPhanCa SET TrangThai='cancelled'")) {
      state.schedules.find((x) => x.MaPhanCa === p.id).TrangThai = "cancelled";
      return rows([]);
    }
    if (s.startsWith("SELECT pc.* FROM LichPhanCa"))
      return rows(
        state.schedules.filter(
          (x) =>
            x.MaChiNhanh === p.branch &&
            x.NgayLamViec >= p.from &&
            x.NgayLamViec < p.end &&
            x.TrangThai === "scheduled",
        ),
      );
    throw new Error("Test double chưa hỗ trợ: " + s.slice(0, 110));
  };
  t.mock.method(db, "query", query);
  t.mock.method(db, "tx", (work) => {
    const run = tail.then(async () => {
      const before = structuredClone(state);
      try {
        return await work({});
      } catch (error) {
        state = before;
        throw error;
      }
    });
    tail = run.catch(() => {});
    return run;
  });
  t.mock.method(products, "catalog", async () => [
    {
      MaSanPham: 1,
      TenSize: "M",
      GiaBan: 39000,
      TenSanPham: "Bạc xỉu",
      LoaiSanPham: "DO_UONG",
      TrangThai: "active",
      DangBan: true,
    },
    {
      MaSanPham: 2,
      TenSize: "PHAN",
      GiaBan: 35000,
      TenSanPham: "Bánh sừng bò",
      LoaiSanPham: "MON_AN",
      TrangThai: "active",
      DangBan: true,
    },
  ]);
  t.mock.method(products, "getToppings", async () => [
    {
      MaTopping: 21,
      TenTopping: "Thêm sữa",
      GiaBan: 5000,
      TrangThai: "active",
    },
  ]);
  return {
    get state() {
      return state;
    },
  };
}
module.exports = { memoryDB };
