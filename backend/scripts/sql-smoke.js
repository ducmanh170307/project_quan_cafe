// Chỉ tạo/xóa database test với tên ngẫu nhiên do script tự sinh.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto");
const db = require("../src/config/db"),
  sql = db.sql,
  clock = require("../src/lib/schedule");
const name = "KiotCafe_Test_" + Date.now() + "_" + randomUUID().slice(0, 8),
  config = db.configuration({ database: "master" });
let admin,
  pool,
  server,
  created = false,
  checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks++;
  console.log("OK", message);
};
(async () => {
  try {
    assert.match(name, /^KiotCafe_Test_\d+_[0-9a-f]{8}$/);
    admin = await new sql.ConnectionPool(config).connect();
    await admin.request().query(`CREATE DATABASE [${name}]`);
    created = true;
    pool = await new sql.ConnectionPool({
      ...config,
      database: name,
    }).connect();
    for (let round = 0; round < 2; round++)
      for (const file of ["01_create_database.sql", "02_insert_data.sql"]) {
        const text = fs
          .readFileSync(
            path.resolve(__dirname, "../../database-sql", file),
            "utf8",
          )
          .replaceAll("CoffeeChainCafeV4", name);
        for (const batch of text.split(/^\s*GO\s*$/gim).filter((s) => s.trim()))
          await pool.request().batch(batch);
      }
    check(true, "Schema/seed chạy lại không nhân đôi");
    const staffCounts = await pool
      .request()
      .query(
        "SELECT MaChiNhanh,COUNT(*) AS Total FROM NhanVien WHERE MaChiNhanh IS NOT NULL GROUP BY MaChiNhanh",
      );
    check(
      staffCounts.recordset.length === 2 &&
        staffCounts.recordset.every((x) => x.Total === 8),
      "Mỗi chi nhánh đúng 8 nhân viên",
    );
    process.env.DB_DATABASE = name;
    await db.close();
    server = require("../src/app").listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${server.address().port}`;
    let cookie = "";
    async function request(
      url,
      body,
      expected = 200,
      method = body === undefined ? "GET" : "POST",
    ) {
      const r = await fetch(base + "/api" + url, {
        method,
        headers: {
          ...(cookie ? { cookie } : {}),
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const d = await r.json();
      assert.equal(r.status, expected, JSON.stringify(d));
      if (r.headers.get("set-cookie"))
        cookie = r.headers.get("set-cookie").split(";")[0];
      return d;
    }
    await request("/auth/login", {
      SoDienThoai: "0900000000",
      MaPIN: "999999",
    });
    const branches = (await request("/branches")).branches,
      b = branches[0].MaChiNhanh,
      menu = (await request("/orders/pos-init?branchId=" + b)).products,
      p = menu.find((p) => p.TenSize === "M"),
      food = menu.find((p) => p.TenSize === "PHAN");
    check(!!food && !!p.HinhAnh, "Menu có món ăn và ảnh đồ uống");
    const week = clock.addDays(clock.monday(clock.localDate()), 7),
      hr = await request(
        `/hr?branchId=${b}&from=${week}&to=${clock.addDays(week, 6)}`,
      ),
      employees = hr.nhanVien.slice(0, 2).map((n) => n.MaNhanVien),
      plan = {
        action: "assign_shift",
        MaChiNhanh: b,
        NhanVienIds: employees,
        NgayLamViec: week,
        GioBatDau: "08:15",
        GioKetThuc: "12:45",
        ViTriLamViec: "Phục vụ",
      };
    const assigned = await request("/hr", plan);
    await request("/hr", plan, 409);
    check(
      assigned.shifts.length === 2,
      "Phân nhiều người theo giờ cụ thể và chặn trùng",
    );
    await request("/hr", {
      ...plan,
      action: "update_shift",
      MaPhanCa: assigned.shifts[0].MaPhanCa,
      NhanVienIds: [employees[0]],
      GioBatDau: "09:00",
      GioKetThuc: "13:00",
    });
    await request("/hr", {
      action: "cancel_shift",
      MaChiNhanh: b,
      MaPhanCa: assigned.shifts[1].MaPhanCa,
      LyDoHuy: "Kiểm thử",
    });
    check(true, "Sửa/hủy ca có lịch sử");
    const fresh = await request("/hr", {
      action: "create_staff",
      MaChiNhanh: b,
      HoTen: "Nhân viên kiểm thử",
      SoDienThoai: "0999999988",
      MaPIN: "123456",
      Role: "STAFF",
      LuongTheoGio: 25000,
    });
    const now = new Date(),
      start = new Date(now.getTime() - 3 * 60000),
      end = new Date(now.getTime() + 60 * 60000),
      local = (d) => new Date(d.getTime() + 420 * 60000).toISOString();
    await request("/hr", {
      action: "assign_shift",
      MaChiNhanh: b,
      NhanVienIds: [fresh.MaNhanVien],
      NgayLamViec: local(start).slice(0, 10),
      GioBatDau: local(start).slice(11, 16),
      GioKetThuc: local(end).slice(11, 16),
      QuaDem: local(start).slice(0, 10) !== local(end).slice(0, 10),
      ViTriLamViec: "Phục vụ",
    });
    await request("/hr", {
      action: "checkin",
      MaChiNhanh: b,
      MaNhanVien: fresh.MaNhanVien,
    });
    await request(
      "/hr",
      { action: "checkin", MaChiNhanh: b, MaNhanVien: fresh.MaNhanVien },
      409,
    );
    await request("/hr", {
      action: "checkout",
      MaChiNhanh: b,
      MaNhanVien: fresh.MaNhanVien,
    });
    check(true, "Chấm công gắn đúng ca, chống check-in trùng");
    const shift = (
      await request("/shifts/open", { MaChiNhanh: b, TienMatDauCa: 1000000 })
    ).shift.MaPhienCa;
    const items = [{ MaSanPham: p.MaSanPham, TenSize: p.TenSize, SoLuong: 2 }],
      quote = await request("/orders/quote", {
        MaChiNhanh: b,
        Items: items,
        MaCode: "CAFE10",
      });
    check(
      quote.discount === Math.floor(quote.subtotal * 0.1),
      "Voucher được hiển thị trước khi thanh toán",
    );
    const payload = {
        MaChiNhanh: b,
        MaPhienCa: shift,
        IdempotencyKey: randomUUID(),
        Items: items,
        MaCode: "CAFE10",
        TongDuKien: quote.total,
        PhuongThucThanhToan: "CASH",
        TienKhachDua: 100000,
      },
      order = (await request("/orders", payload)).order;
    check(
      Number(order.TongPhaiTra) === quote.total,
      "Tổng tiền thanh toán đúng báo giá",
    );
    check(
      (await request("/orders", payload)).order.MaDonHang === order.MaDonHang,
      "Gửi lại không tạo đơn trùng",
    );
    const uses = await pool
      .request()
      .query(
        "SELECT SoLuotDaDung FROM ChuongTrinhKhuyenMai WHERE MaCode='CAFE10'",
      );
    check(
      uses.recordset[0].SoLuotDaDung === 1,
      "Xem trước không tiêu lượt; thu tiền tiêu đúng một lượt",
    );
    await request(
      "/shifts/close",
      { MaPhienCa: shift, TienMatThucTeCuoiCa: 1000000 + quote.total },
      409,
    );
    await request("/kds/update", {
      Action: "complete_order",
      MaDonHang: order.MaDonHang,
    });
    const online = (
      await request(
        "/public/orders",
        {
          MaChiNhanh: b,
          IdempotencyKey: randomUUID(),
          TenKhachHang: "Khách kiểm thử",
          SoDienThoaiKhach: "0999999999",
          Items: [{ MaSanPham: food.MaSanPham, TenSize: "PHAN", SoLuong: 1 }],
        },
        201,
      )
    ).order;
    check(
      online.TrangThaiThanhToan === "unpaid",
      "Đơn online món ăn chờ thu tiền",
    );
    await request("/orders/pay", {
      MaDonHang: online.MaDonHang,
      MaPhienCa: shift,
      MaCode: "",
      PhuongThucThanhToan: "CASH",
      TienKhachDua: 100000,
    });
    await request("/kds/update", {
      Action: "complete_order",
      MaDonHang: online.MaDonHang,
    });
    const final = await request("/shifts?branchId=" + b);
    await request("/shifts/close", {
      MaPhienCa: shift,
      TienMatThucTeCuoiCa: final.theoreticalCash,
    });
    check(true, "Chốt ca đúng số liệu");
    console.log(`PASS ${checks} nhóm kiểm tra SQL thật.`);
  } catch (error) {
    console.error("FAIL SQL integration:", error.message);
    process.exitCode = 1;
  } finally {
    if (server) await new Promise((r) => server.close(r));
    await db.close().catch(() => {});
    if (pool) await pool.close().catch(() => {});
    if (admin && created)
      await admin
        .request()
        .query(
          `ALTER DATABASE [${name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${name}]`,
        )
        .catch((e) => {
          console.error("Cần dọn database test:", name, e.message);
          process.exitCode = 1;
        });
    if (admin) await admin.close().catch(() => {});
  }
})();
