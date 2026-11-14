// Linh: menu đồ uống/món ăn, size, topping và hình ảnh.
const db = require("../config/db");
const v = require("../lib/validation");
const access = require("../lib/access");
const { assert } = require("../lib/errors");
const images = require("../lib/menuImage");
async function catalog(branchId, tx = null) {
  const branch = v.id(branchId, "Chi nhánh");
  const exists = await db.query(
    "SELECT MaChiNhanh FROM ChiNhanh WHERE MaChiNhanh=@branch",
    { branch },
    tx,
  );
  assert(exists.recordset[0], 404, "Không tìm thấy chi nhánh.");
  return (
    await db.query(
      `SELECT sp.MaSanPham,sp.MaDanhMuc,sp.TenSanPham,sp.LoaiSanPham,sp.HinhAnh,sp.TrangThai,dm.TenDanhMuc,sz.TenSize,sz.GiaBan,CAST(1 AS BIT) AS DangBan FROM SanPham sp JOIN DanhMuc dm ON sp.MaDanhMuc=dm.MaDanhMuc JOIN SanPham_Size sz ON sp.MaSanPham=sz.MaSanPham WHERE sp.TrangThai='active' ORDER BY sp.LoaiSanPham,sp.MaSanPham,sz.TenSize`,
      {},
      tx,
    )
  ).recordset;
}
async function getAllProducts(query, actor) {
  access.role(actor, access.managers);
  const page = v.number(query.page ?? 1, "Trang", {
      min: 1,
      max: 1000000,
      integer: true,
    }),
    limit = v.number(query.limit ?? 20, "Số dòng", {
      min: 1,
      max: 100,
      integer: true,
    }),
    search = v.text(query.search, "Tìm kiếm", 150, true),
    order = query.sortType === "ASC" ? "ASC" : "DESC";
  const sort =
    {
      MaSanPham: "sp.MaSanPham",
      TenSanPham: "sp.TenSanPham",
      GiaBan: "sp.GiaBanCoBan",
    }[query.sortBy] || "sp.MaSanPham";
  const r = await db.query(
    `SELECT sp.*,dm.TenDanhMuc FROM SanPham sp JOIN DanhMuc dm ON sp.MaDanhMuc=dm.MaDanhMuc WHERE sp.TenSanPham LIKE @search ORDER BY ${sort} ${order} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    { search: `%${search}%`, offset: (page - 1) * limit, limit },
  );
  const count = await db.query(
      "SELECT COUNT(*) AS Total FROM SanPham WHERE TenSanPham LIKE @search",
      { search: `%${search}%` },
    ),
    categories = await db.query("SELECT * FROM DanhMuc ORDER BY MaDanhMuc"),
    variants = await db.query("SELECT * FROM SanPham_Size");
  return {
    products: r.recordset.map((p) => ({
      ...p,
      Sizes: variants.recordset.filter((s) => s.MaSanPham === p.MaSanPham),
    })),
    categories: categories.recordset,
    total: count.recordset[0].Total,
    page,
    limit,
  };
}
async function save(data, actor, productId = null) {
  access.role(actor, ["ADMIN"]);
  const name = v.text(data.TenSanPham, "Tên món", 150),
    category = v.id(data.MaDanhMuc),
    price = v.money(data.GiaBan, "Giá bán", 1),
    kind = v.choice(
      data.LoaiSanPham || "DO_UONG",
      ["DO_UONG", "MON_AN"],
      "Loại món",
    ),
    size = v.choice(
      data.TenSize || (kind === "MON_AN" ? "PHAN" : "M"),
      kind === "MON_AN" ? ["PHAN"] : ["S", "M", "L"],
      "Size",
    ),
    status = v.choice(
      data.TrangThai || "active",
      ["active", "hidden"],
      "Trạng thái",
    ),
    image = images.imagePath(data.HinhAnh),
    id = productId == null ? null : v.id(productId);
  return db.tx(async (tx) => {
    let pid = id;
    if (id) {
      const existing = (
        await db.query(
          "SELECT * FROM SanPham WITH(UPDLOCK,HOLDLOCK) WHERE MaSanPham=@id",
          { id },
          tx,
        )
      ).recordset[0];
      assert(existing, 404, "Món không tồn tại.");
      if (existing.LoaiSanPham !== kind) {
        const history = await db.query(
          "SELECT TOP 1 MaChiTietDon FROM ChiTietDonHang WHERE MaSanPham=@id",
          { id },
          tx,
        );
        assert(
          !history.recordset.length,
          409,
          "Món đã có giao dịch không đổi loại; hãy tạo món mới.",
        );
        await db.query(
          "DELETE FROM SanPham_Size WHERE MaSanPham=@id",
          { id },
          tx,
        );
      }
      await db.query(
        `UPDATE SanPham SET TenSanPham=@name,MaDanhMuc=@category,LoaiSanPham=@kind,HinhAnh=@image,TrangThai=@status,GiaBanCoBan=CASE WHEN @size IN ('M','PHAN') THEN @price ELSE GiaBanCoBan END WHERE MaSanPham=@id`,
        { id, name, category, kind, image, status, size, price },
        tx,
      );
    } else {
      const r = await db.query(
        "INSERT INTO SanPham(TenSanPham,MaDanhMuc,LoaiSanPham,HinhAnh,GiaBanCoBan,TrangThai) OUTPUT INSERTED.MaSanPham VALUES(@name,@category,@kind,@image,@price,@status)",
        { name, category, kind, image, price, status },
        tx,
      );
      pid = r.recordset[0].MaSanPham;
    }
    await db.query(
      "IF EXISTS(SELECT 1 FROM SanPham_Size WHERE MaSanPham=@pid AND TenSize=@size) UPDATE SanPham_Size SET GiaBan=@price WHERE MaSanPham=@pid AND TenSize=@size; ELSE INSERT INTO SanPham_Size(MaSanPham,TenSize,GiaBan) VALUES(@pid,@size,@price)",
      { pid, size, price },
      tx,
    );
    return { MaSanPham: pid, message: "Đã lưu món, ảnh và giá bán." };
  });
}
async function deleteProduct(productId, actor) {
  access.role(actor, ["ADMIN"]);
  const id = v.id(productId),
    r = await db.query(
      "UPDATE SanPham SET TrangThai='hidden' OUTPUT INSERTED.MaSanPham WHERE MaSanPham=@id",
      { id },
    );
  assert(r.recordset[0], 404, "Món không tồn tại.");
  return { message: "Đã ẩn món." };
}
async function getToppings(actor = null, tx = null) {
  const all = !!actor && access.managers.includes(actor.Role);
  return (
    await db.query(
      "SELECT MaTopping,TenTopping,GiaBan,TrangThai FROM Topping WHERE @all=1 OR TrangThai='active' ORDER BY MaTopping",
      { all },
      tx,
    )
  ).recordset;
}
async function saveTopping(data, actor, toppingId = null) {
  access.role(actor, ["ADMIN"]);
  const name = v.text(data.TenTopping, "Tên topping", 100),
    price = v.money(data.GiaBan, "Giá topping"),
    status = v.choice(
      data.TrangThai || "active",
      ["active", "hidden"],
      "Trạng thái topping",
    ),
    id = toppingId ? v.id(toppingId) : null;
  const r = await db.query(
    id
      ? "UPDATE Topping SET TenTopping=@name,GiaBan=@price,TrangThai=@status OUTPUT INSERTED.MaTopping WHERE MaTopping=@id"
      : "INSERT INTO Topping(TenTopping,GiaBan,TrangThai) OUTPUT INSERTED.MaTopping VALUES(@name,@price,@status)",
    { id, name, price, status },
  );
  assert(r.recordset[0], 404, "Không tìm thấy topping.");
  return { MaTopping: r.recordset[0].MaTopping, message: "Đã lưu topping." };
}
async function uploadImage(data, actor) {
  access.role(actor, ["ADMIN"]);
  return {
    HinhAnh: await images.saveUpload(data.HinhAnhData),
    message: "Đã tải ảnh lên.",
  };
}
module.exports = {
  catalog,
  getAllProducts,
  save,
  deleteProduct,
  getToppings,
  saveTopping,
  uploadImage,
};
