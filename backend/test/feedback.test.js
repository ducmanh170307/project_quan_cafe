// Như Ý phụ trách kiểm thử.
const { test } = require("node:test");
const assert = require("node:assert/strict");

test("Phân ca theo khoảng ngày và các thứ trong tuần", () => {
  const { shiftDates } = require("../src/models/hrModel");
  // 16/11/2026 là Thứ 2. Từ T2 16/11 đến CN 22/11, chỉ tick T2–T6 => 5 ngày.
  assert.deepEqual(
    shiftDates({ TuNgay: "2026-11-16", DenNgay: "2026-11-22", CacThu: [1, 2, 3, 4, 5] }),
    ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"],
  );
  // Không truyền CacThu: lấy cả tuần. Một ngày đơn vẫn dùng NgayLamViec.
  assert.equal(shiftDates({ TuNgay: "2026-11-16", DenNgay: "2026-11-22" }).length, 7);
  assert.deepEqual(shiftDates({ NgayLamViec: "2026-11-16" }), ["2026-11-16"]);
  // Cuối tuần trong 2 tuần liên tiếp => 4 ngày.
  assert.equal(
    shiftDates({ TuNgay: "2026-11-16", DenNgay: "2026-11-29", CacThu: [6, 7] }).length,
    4,
  );
});

test("Khoảng ngày sai bị từ chối", () => {
  const { shiftDates } = require("../src/models/hrModel");
  assert.throws(() => shiftDates({ TuNgay: "2026-11-20", DenNgay: "2026-11-16" }), { status: 400 });
  assert.throws(() => shiftDates({ TuNgay: "2026-11-01", DenNgay: "2026-12-31" }), { status: 400 });
  assert.throws(() => shiftDates({ TuNgay: "2026-11-16", DenNgay: "2026-11-22", CacThu: [] }), { status: 400 });
  assert.throws(() => shiftDates({ TuNgay: "2026-11-16", DenNgay: "2026-11-22", CacThu: [8] }), { status: 400 });
});
