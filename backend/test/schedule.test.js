const { test } = require("node:test"),
  assert = require("node:assert/strict");
const s = require("../src/lib/schedule"),
  db = require("../src/config/db"),
  products = require("../src/models/productModel"),
  hr = require("../src/models/hrModel"),
  { memoryDB } = require("./helpers/memory-db");
const actor = { MaNhanVien: 1, MaChiNhanh: 1, Role: "ADMIN" };
const data = (extra) => ({
  action: "assign_shift",
  MaChiNhanh: 1,
  NhanVienIds: [2],
  NgayLamViec: "2026-11-09",
  GioBatDau: "08:00",
  GioKetThuc: "12:00",
  ViTriLamViec: "Thu ngân",
  ...extra,
});
const row = (id, day, start, end, extra = {}) => {
  const n = s.normalize(
    data({ NgayLamViec: day, GioBatDau: start, GioKetThuc: end }),
  );
  return {
    MaPhanCa: id,
    TrangThai: "scheduled",
    BatDauLam: n.begins,
    KetThucLam: n.ends,
    ...extra,
  };
};
test("Giờ phân ca được chuyển chính xác từ giờ Việt Nam sang UTC", () => {
  const n = s.normalize(data());
  assert.equal(n.begins.toISOString(), "2026-11-09T01:00:00.000Z");
  assert.equal(n.hours, 4);
});
test("Hỗ trợ ca qua đêm và bắt buộc xác nhận ngày hôm sau", () => {
  assert.throws(
    () => s.normalize(data({ GioBatDau: "22:00", GioKetThuc: "02:00" })),
    { status: 400 },
  );
  const n = s.normalize(
    data({ GioBatDau: "22:00", GioKetThuc: "02:00", QuaDem: true }),
  );
  assert.equal(n.hours, 4);
  assert.equal(s.localDate(n.ends), "2026-11-10");
});
test("Chặn giờ sai, ca 0 giờ, quá dài và vị trí lạ", () => {
  for (const extra of [
    { GioBatDau: "25:00" },
    { GioKetThuc: "08:00" },
    { GioBatDau: "00:00", GioKetThuc: "13:00" },
    { ViTriLamViec: "Tự cấp quyền" },
  ])
    assert.throws(() => s.normalize(data(extra)), { status: 400 });
});
test("Ca tiếp giáp được phép, ca chồng giờ hoặc qua đêm bị chặn", () => {
  const a = row(1, "2026-11-09", "08:00", "12:00");
  s.validateAgainst(
    s.normalize(data({ GioBatDau: "12:00", GioKetThuc: "16:00" })),
    [a],
  );
  assert.throws(
    () =>
      s.validateAgainst(
        s.normalize(data({ GioBatDau: "11:59", GioKetThuc: "14:00" })),
        [a],
      ),
    { status: 409 },
  );
  const night = s.normalize(
    data({ GioBatDau: "22:00", GioKetThuc: "02:00", QuaDem: true }),
  );
  assert.throws(
    () =>
      s.validateAgainst(
        s.normalize(
          data({
            NgayLamViec: "2026-11-10",
            GioBatDau: "01:00",
            GioKetThuc: "05:00",
          }),
        ),
        [
          {
            ...night,
            BatDauLam: night.begins,
            KetThucLam: night.ends,
            TrangThai: "scheduled",
          },
        ],
      ),
    { status: 409 },
  );
});
test("Ca đã hủy/nghỉ duyệt không chiếm giờ, ca xin nghỉ còn chờ vẫn chiếm giờ", () => {
  const candidate = s.normalize(data()),
    a = row(1, "2026-11-09", "08:00", "12:00");
  for (const status of ["Absent", "cancelled"])
    s.validateAgainst(candidate, [{ ...a, TrangThai: status }]);
  assert.throws(
    () =>
      s.validateAgainst(candidate, [{ ...a, TrangThai: "Leave_Requested" }]),
    { status: 409 },
  );
  s.validateAgainst(candidate, [a], 1);
});
test("Chặn tổng giờ vượt ngày và tuần, tính cả hai phần ca qua đêm", () => {
  const a = row(1, "2026-11-09", "00:00", "08:00");
  assert.throws(
    () =>
      s.validateAgainst(
        s.normalize(data({ GioBatDau: "10:00", GioKetThuc: "16:00" })),
        [a],
      ),
    { status: 409 },
  );
  const week = Array.from({ length: 6 }, (_, i) =>
    row(i + 1, s.addDays("2026-11-09", i), "06:00", "14:00"),
  );
  assert.throws(
    () =>
      s.validateAgainst(
        s.normalize(
          data({
            NgayLamViec: "2026-11-15",
            GioBatDau: "08:00",
            GioKetThuc: "09:00",
          }),
        ),
        week,
      ),
    { status: 409 },
  );
});
test("Phân một lần cho nhiều nhân viên, vị trí và giờ tùy chọn được lưu", async (t) => {
  const m = memoryDB(t, db, products);
  const result = await hr.action(
    data({
      NhanVienIds: [2, 3],
      GioBatDau: "13:15",
      GioKetThuc: "17:45",
      ViTriLamViec: "Phục vụ",
    }),
    actor,
  );
  assert.equal(result.shifts.length, 2);
  assert.equal(m.state.schedules[0].ViTriLamViec, "Phục vụ");
  assert.equal(s.localDate(m.state.schedules[0].BatDauLam), "2026-11-09");
});
test("Một người trùng lịch sẽ rollback cả nhóm, không phân dở dang", async (t) => {
  const m = memoryDB(t, db, products);
  await hr.action(data({ NhanVienIds: [3] }), actor);
  await assert.rejects(() => hr.action(data({ NhanVienIds: [2, 3] }), actor), {
    status: 409,
  });
  assert.equal(m.state.schedules.length, 1);
  assert.equal(m.state.schedules[0].MaNhanVien, 3);
});
test("Chặn dùng nhân viên chi nhánh khác và tự phân ca bằng tài khoản cashier", async (t) => {
  const m = memoryDB(t, db, products);
  await assert.rejects(() => hr.action(data({ NhanVienIds: [4] }), actor), {
    status: 400,
  });
  await assert.rejects(() => hr.action(data(), { ...actor, Role: "CASHIER" }), {
    status: 403,
  });
  assert.equal(m.state.schedules.length, 0);
});
test("Sửa/hủy ca có kiểm tra chồng giờ; lịch đã chấm công bất biến", async (t) => {
  const m = memoryDB(t, db, products);
  await hr.action(data(), actor);
  await hr.action(
    data({
      action: "update_shift",
      MaPhanCa: 1,
      GioBatDau: "09:00",
      GioKetThuc: "13:00",
    }),
    actor,
  );
  assert.equal(s.localDate(m.state.schedules[0].BatDauLam), "2026-11-09");
  m.state.attendance.push({ MaChamCong: 1, MaPhanCa: 1 });
  await assert.rejects(
    () =>
      hr.action(
        {
          action: "cancel_shift",
          MaChiNhanh: 1,
          MaPhanCa: 1,
          LyDoHuy: "Đổi lịch",
        },
        actor,
      ),
    { status: 409 },
  );
  m.state.attendance = [];
  await hr.action(
    { action: "cancel_shift", MaChiNhanh: 1, MaPhanCa: 1, LyDoHuy: "Đổi lịch" },
    actor,
  );
  assert.equal(m.state.schedules[0].TrangThai, "cancelled");
});
test("Sao chép tuần giữ giờ/vị trí và chặn sao chép trùng", async (t) => {
  const m = memoryDB(t, db, products);
  await hr.action(data({ NhanVienIds: [2, 3] }), actor);
  await hr.action(
    {
      action: "copy_week",
      MaChiNhanh: 1,
      TuTuan: "2026-11-09",
      DenTuan: "2026-11-16",
    },
    actor,
  );
  assert.equal(m.state.schedules.length, 4);
  assert.equal(m.state.schedules[2].NgayLamViec, "2026-11-16");
  await assert.rejects(
    () =>
      hr.action(
        {
          action: "copy_week",
          MaChiNhanh: 1,
          TuTuan: "2026-11-09",
          DenTuan: "2026-11-16",
        },
        actor,
      ),
    { status: 409 },
  );
  assert.equal(m.state.schedules.length, 4);
});
