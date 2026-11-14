import { ApiClient, UI } from "../services/api.js";
import { ManhModule } from "./manhBranchHr.js";
const LinhModule = {
  products: [],
  toppings: [],
  productPage: 1,
  productTotal: 0,
  search: "",
  reset() {
    this.products = [];
    this.toppings = [];
    this.productPage = 1;
    this.productTotal = 0;
    this.search = "";
    for (const id of [
      "productTableBody",
      "toppingTableBody",
      "reportProducts",
      "reportMethods",
    ])
      UI.el(id).innerHTML = "";
    UI.el("reportSummary").innerHTML = "";
    this.resetProduct();
    this.resetTopping();
  },
  hydrateProducts(d) {
    this.products = d.products;
    this.productTotal = d.total;
    const selected = UI.el("productCategory").value;
    UI.el("productCategory").innerHTML = UI.options(
      d.categories,
      "MaDanhMuc",
      "TenDanhMuc",
    );
    if (d.categories.some((c) => String(c.MaDanhMuc) === selected))
      UI.el("productCategory").value = selected;
    UI.el("productPage").textContent =
      `${d.page} / ${Math.max(1, Math.ceil(d.total / d.limit))}`;
    UI.el("productTableBody").innerHTML =
      d.products
        .map(
          (p) =>
            `<tr><td><img class="menu-thumb" src="${UI.escape(p.HinhAnh || "/src/assets/menu/placeholder.svg")}" alt="${UI.escape(p.TenSanPham)}" onerror="this.onerror=null;this.src='/src/assets/menu/placeholder.svg'"><br>${UI.escape(p.TenSanPham)}<br><small>${p.LoaiSanPham === "MON_AN" ? "Món ăn" : "Đồ uống"}</small></td><td>${p.Sizes.map((s) => `${UI.escape(s.TenSize === "PHAN" ? "Phần" : s.TenSize)}: ${UI.money(s.GiaBan)}đ`).join("<br>")}</td><td>${UI.escape(p.TrangThai)}</td><td>${ManhModule.user.Role === "ADMIN" ? p.Sizes.map((s) => `<button class="btn small-btn" onclick="LinhModule.editProduct(${p.MaSanPham},'${s.TenSize}')">Sửa ${s.TenSize === "PHAN" ? "phần" : s.TenSize}</button>`).join("") + (p.LoaiSanPham === "DO_UONG" ? `<button class="btn small-btn" onclick="LinhModule.editProduct(${p.MaSanPham},'new')">+ Size</button>` : "") + `<button class="btn btn-red small-btn" onclick="UI.run(this,()=>LinhModule.hideProduct(${p.MaSanPham}))">Ẩn</button>` : "Chỉ xem"}</td></tr>`,
        )
        .join("") || UI.empty(4);
  },
  resetProduct() {
    for (const id of [
      "editProductId",
      "newProdName",
      "newProdPrice",
      "productImage",
      "productImageFile",
    ])
      UI.el(id).value = "";
    UI.el("productKind").value = "DO_UONG";
    this.changeKind();
    UI.el("productStatus").value = "active";
    UI.el("productFormTitle").textContent = "Thêm đồ uống / món ăn";
    this.previewImage();
  },
  changeKind() {
    const food = UI.value("productKind") === "MON_AN";
    UI.el("productSize").innerHTML = food
      ? '<option value="PHAN">Phần</option>'
      : "<option>M</option><option>L</option><option>S</option>";
  },
  previewImage() {
    const image = UI.el("productImagePreview");
    image.onerror = () => {
      image.onerror = null;
      image.src = "/src/assets/menu/placeholder.svg";
    };
    image.src = UI.value("productImage") || "/src/assets/menu/placeholder.svg";
  },
  async uploadImage() {
    const file = UI.el("productImageFile").files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) throw new Error("Ảnh tối đa 2 MB.");
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Không đọc được ảnh."));
      reader.readAsDataURL(file);
    });
    const r = await ApiClient.post("/products/images", { HinhAnhData: data });
    UI.el("productImage").value = r.HinhAnh;
    this.previewImage();
    UI.notify(r.message);
  },
  editProduct(id, size) {
    const p = this.products.find((p) => p.MaSanPham === id);
    this.resetProduct();
    UI.el("editProductId").value = id;
    UI.el("productFormTitle").textContent = `Sửa ${p.TenSanPham}`;
    UI.el("newProdName").value = p.TenSanPham;
    UI.el("productCategory").value = p.MaDanhMuc;
    UI.el("productKind").value = p.LoaiSanPham;
    this.changeKind();
    UI.el("productStatus").value = p.TrangThai;
    UI.el("productImage").value = p.HinhAnh || "";
    if (size !== "new") {
      UI.el("productSize").value = size;
      UI.el("newProdPrice").value = p.Sizes.find(
        (s) => s.TenSize === size,
      ).GiaBan;
    } else
      UI.el("productSize").value =
        ["M", "L", "S"].find((s) => !p.Sizes.some((v) => v.TenSize === s)) ||
        "M";
    this.previewImage();
    UI.el("productFormTitle").scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  },
  async saveProduct() {
    const id = UI.value("editProductId"),
      data = {
        TenSanPham: UI.value("newProdName"),
        MaDanhMuc: UI.value("productCategory"),
        LoaiSanPham: UI.value("productKind"),
        HinhAnh: UI.value("productImage"),
        GiaBan: UI.value("newProdPrice"),
        TenSize: UI.value("productSize"),
        TrangThai: UI.value("productStatus"),
      };
    const r = id
      ? await ApiClient.put(`/products/${id}`, data)
      : await ApiClient.post("/products", data);
    UI.notify(r.message);
    this.resetProduct();
    await ManhModule.refresh();
  },
  async hideProduct(id) {
    const r = await ApiClient.delete(`/products/${id}`);
    UI.notify(r.message);
    await ManhModule.refresh();
  },
  async searchProducts() {
    this.search = UI.value("productSearch");
    this.productPage = 1;
    await ManhModule.refresh();
  },
  async pageProducts(delta) {
    const page = this.productPage + delta;
    if (page < 1 || page > Math.max(1, Math.ceil(this.productTotal / 12)))
      return;
    this.productPage = page;
    await ManhModule.refresh();
  },
  hydrateToppings(rows) {
    this.toppings = rows;
    UI.el("toppingTableBody").innerHTML =
      rows
        .map(
          (t) =>
            `<tr><td>${UI.escape(t.TenTopping)}</td><td>${UI.money(t.GiaBan)}</td><td>${UI.escape(t.TrangThai)}</td><td>${ManhModule.user.Role === "ADMIN" ? `<button class="btn small-btn" onclick="LinhModule.editTopping(${t.MaTopping})">Sửa</button>` : ""}</td></tr>`,
        )
        .join("") || UI.empty(4);
  },
  editTopping(id) {
    const t = this.toppings.find((t) => t.MaTopping === id);
    UI.el("editToppingId").value = id;
    UI.el("toppingName").value = t.TenTopping;
    UI.el("toppingPrice").value = t.GiaBan;
    UI.el("toppingStatus").value = t.TrangThai;
  },
  resetTopping() {
    for (const id of ["editToppingId", "toppingName", "toppingPrice"])
      UI.el(id).value = "";
    UI.el("toppingStatus").value = "active";
  },
  async saveTopping() {
    const id = UI.value("editToppingId"),
      data = {
        TenTopping: UI.value("toppingName"),
        GiaBan: UI.value("toppingPrice"),
        TrangThai: UI.value("toppingStatus"),
      };
    const r = id
      ? await ApiClient.put(`/products/toppings/${id}`, data)
      : await ApiClient.post("/products/toppings", data);
    this.resetTopping();
    UI.notify(r.message);
    await ManhModule.refresh();
  },
};
export { LinhModule };
