# ☕ Hệ Thống Quản Trị Chuỗi Cà Phê Toàn Diện (KiotCafe Chain ERP & POS)

**Môn học:** Công Nghệ Phần Mềm | **Kiến trúc:** 3-Tier Modular MVC (`backend/` • `frontend/` • `database-sql/`) | **Công nghệ:** Node.js, Express.js, Microsoft SQL Server (`CoffeeChainSystem`)

---

## 👥 Phân Công Nhiệm Vụ & Quản Lý Mã Nguồn (Cân Bằng 25% / Thành Viên)

Dự án được chia đều công việc theo tỷ lệ **25% - 25% - 25% - 25%** cho 4 thành viên. Mỗi thành viên phụ trách độc lập **02 Phân hệ nghiệp vụ**, **06 Files Backend MVC (`2 Controllers + 2 Models + 2 Routes`)**, **01 Module Frontend JS**, **06–08 Bảng CSDL SQL Server** và **06–07 Kịch bản Kiểm thử (Test Cases)**:

| Thành viên | Vai trò & Nhánh Git | Tỷ trọng | 02 Phân hệ Nghiệp vụ Phụ trách | Các File Backend MVC (`backend/src/...`) | Các File Frontend & SQL (`frontend/` & `database-sql/`) | Trạng thái |
| :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| **1. Trần Đức Mạnh** | **Nhóm trưởng**<br>(`manh`) | **25%** | • **Luồng 0:** Quản trị Chuỗi Chi Nhánh<br>• **Luồng 1:** Nhân sự, Phân ca & Chấm công | • Core: `config/db.js`, `server.js`<br>• `controllers/branchController.js`<br>• `controllers/hrController.js`<br>• `models/branchModel.js`<br>• `models/hrModel.js`<br>• `routes/branchRoutes.js`<br>• `routes/hrRoutes.js` | • `frontend/index.html`<br>• `frontend/src/assets/style.css`<br>• `frontend/src/services/api.js`<br>• `frontend/src/modules/manhBranchHr.js`<br>• `database-sql/01_create_database.sql` *(6 bảng Chi nhánh & HR)* | ✅ Đã Hoàn Thiện |
| **2. Ý** | **Thành viên**<br>(`y`) | **25%** | • **Luồng 2 & 5:** Mở/Chốt Ca POS, Thu Chi Nội Bộ & Đối Soát Két<br>• **Luồng 8:** Khuyến Mãi Voucher & Tích Điểm CRM | • `controllers/shiftController.js`<br>• `controllers/promoController.js`<br>• `models/shiftModel.js`<br>• `models/promoModel.js`<br>• `routes/shiftRoutes.js`<br>• `routes/promoRoutes.js` | • `frontend/src/modules/yShiftCashflow.js` *(UI Tab 2: Mở/Chốt Ca POS + Tab 8: Voucher & CRM)*<br>• `database-sql/01_create_database.sql` *(6 bảng Ca POS & CRM)* | ✅ Đã Hoàn Thiện |
| **3. Trúc** | **Thành viên**<br>(`truc`) | **25%** | • **Luồng 3:** Bán Hàng Tại Quầy (POS) & Đơn Online<br>• **Luồng 4:** Điều Phối Pha Chế Bếp (KDS) | • `controllers/orderController.js`<br>• `controllers/kdsController.js`<br>• `models/orderModel.js`<br>• `models/kdsModel.js`<br>• `routes/orderRoutes.js`<br>• `routes/kdsRoutes.js` | • `frontend/src/modules/trucPosKds.js` *(UI Tab 3: Bán hàng POS + Tab 4: Bếp KDS + Tab 5: Đơn Online)*<br>• `database-sql/02_insert_data.sql` *(6 bảng Đơn hàng & KDS)* | ✅ Đã Hoàn Thiện |
| **4. Linh** | **Thành viên**<br>(`linh`) | **25%** | • **Luồng 6:** Quản Lý Thực Đơn & Công Thức BOM<br>• **Luồng 7:** Quản Trị Kho Đa Điểm & Điều Chuyển | • `controllers/productController.js`<br>• `controllers/inventoryController.js`<br>• `models/productModel.js`<br>• `models/inventoryModel.js`<br>• `routes/productRoutes.js`<br>• `routes/inventoryRoutes.js` | • `frontend/src/modules/linhMenuInventoryPromo.js` *(UI Tab 6: Menu BOM + Tab 7: Tồn kho & Chuyển kho)*<br>• `database-sql/02_insert_data.sql` *(8 bảng Menu, BOM & Kho)* | ✅ Đã Hoàn Thiện |

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
DuAnCNPM-QuanLyChuoiCafe/
│
├── README.md                              # Tài liệu kiến trúc & bảng phân công cân bằng 4 thành viên
├── .gitignore                             # Chặn đẩy thư mục node_modules/ và file .env lên GitHub
│
├── backend/                               # Node.js + Express + MSSQL (CoffeeChainSystem)
│   ├── package.json                       # Khai báo thư viện (express, mssql, dotenv, cors)
│   ├── .env.example                       # File mẫu cấu hình kết nối SQL Server (Port 5000)
│   └── src/
│       ├── server.js                      # [Mạnh] Khởi tạo Express Server & gắn kết 8 Routes + Static UI
│       ├── config/
│       │   └── db.js                      # [Mạnh] Kết nối Connection Pool tới SQL Server
│       ├── controllers/                   # 8 Controllers xử lý nghiệp vụ (2 Controllers / thành viên)
│       │   ├── branchController.js        # [1. Mạnh] Điều phối Luồng 0: Đóng/mở chi nhánh & đồng bộ kho
│       │   ├── hrController.js            # [1. Mạnh] Điều phối Luồng 1: Nhân sự, xếp ca & chấm công
│       │   ├── shiftController.js         # [2. Ý]    Điều phối Luồng 2 & 5: Mở/chốt ca POS & đối soát két
│       │   ├── promoController.js         # [2. Ý]    Điều phối Luồng 8: Mã khuyến mãi Voucher & tích điểm CRM
│       │   ├── orderController.js         # [3. Trúc] Điều phối Luồng 3: Giỏ hàng POS, thanh toán & đơn Online
│       │   ├── kdsController.js           # [3. Trúc] Điều phối Luồng 4: Màn hình pha chế KDS & trừ kho BOM
│       │   ├── productController.js       # [4. Linh] Điều phối Luồng 6: Quản lý Menu, Size, Topping & BOM
│       │   └── inventoryController.js     # [4. Linh] Điều phối Luồng 7: Cảnh báo tồn (<200) & chuyển kho
│       ├── models/                        # 8 Models tương tác trực tiếp CSDL SQL Server (2 Models / người)
│       │   ├── branchModel.js             # [1. Mạnh] Truy vấn ChiNhanh & OUTPUT INSERTED tạo kho 2000/200
│       │   ├── hrModel.js                 # [1. Mạnh] Truy vấn NhanVien, LichPhanCa, BangChamCong
│       │   ├── shiftModel.js              # [2. Ý]    Truy vấn PhienLamViecPOS, PhieuThuChiNoiBo
│       │   ├── promoModel.js              # [2. Ý]    Truy vấn ChuongTrinhKhuyenMai, KhachHang, HangThanhVien
│       │   ├── orderModel.js              # [3. Trúc] Transaction lưu DonHang, ChiTietDonHang
│       │   ├── kdsModel.js                # [3. Trúc] Truy vấn HangDoiPhaChe_KDS & trừ nguyên liệu tự động
│       │   ├── productModel.js            # [4. Linh] Truy vấn SanPham, Topping, CongThucPhaChe_BOM
│       │   └── inventoryModel.js          # [4. Linh] Truy vấn NguyenLieu, TonKhoChiNhanh, PhieuChuyenKho
│       └── routes/                        # 8 Routes khai báo RESTful API (2 Routes / thành viên)
│           ├── branchRoutes.js            # [1. Mạnh] /api/branches
│           ├── hrRoutes.js                # [1. Mạnh] /api/hr
│           ├── shiftRoutes.js             # [2. Ý]    /api/shifts
│           ├── promoRoutes.js             # [2. Ý]    /api/promos
│           ├── orderRoutes.js             # [3. Trúc] /api/orders
│           ├── kdsRoutes.js               # [3. Trúc] /api/kds
│           ├── productRoutes.js           # [4. Linh] /api/products
│           └── inventoryRoutes.js         # [4. Linh] /api/inventory
│
├── frontend/                              # Giao diện SPA Modular (HTML5 + CSS3 Dark Mode + ES6 Modules)
│   ├── index.html                         # [Mạnh] Khung giao diện tổng (Master Layout, Header & 8 Tabs)
│   └── src/
│       ├── assets/
│       │   └── style.css                  # [Mạnh] Hệ thống giao diện Dark Mode POS & Responsive Grid
│       ├── services/
│       │   └── api.js                     # [Mạnh] Cấu hình Fetch REST Client dùng chung toàn hệ thống
│       └── modules/                       # Chia đều 4 Module JS xử lý giao diện cho 4 thành viên
│           ├── manhBranchHr.js            # [1. Mạnh] Logic UI Tab Chi nhánh (Luồng 0) & Phân ca/Chấm công (Luồng 1)
│           ├── yShiftCashflow.js          # [2. Ý]    Logic UI Tab Mở/Chốt ca POS (Luồng 2,5) & Voucher CRM (Luồng 8)
│           ├── trucPosKds.js              # [3. Trúc] Logic UI Tab Bán hàng POS, Đơn Online (Luồng 3) & Bếp KDS (Luồng 4)
│           └── linhMenuInventoryPromo.js  # [4. Linh] Logic UI Tab Thực đơn BOM (Luồng 6) & Kho đa điểm (Luồng 7)
│
└── database-sql/                          # Kịch bản khởi tạo CSDL Microsoft SQL Server (CoffeeChainSystem)
    ├── 01_create_database.sql             # [Mạnh & Ý] Toàn bộ Schema 26 bảng chuẩn 3NF & Ràng buộc khóa
    └── 02_insert_data.sql                 # [Trúc & Linh] Dữ liệu mẫu toàn chuỗi + Script nhân bản nhân sự
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy Nhanh (Quick Start)

### Bước 1: Khởi tạo Cơ sở dữ liệu SQL Server
Mở **SQL Server Management Studio (SSMS)**, thực thi lần lượt 2 file kịch bản trong thư mục `database-sql/`:
1. `database-sql/01_create_database.sql`
2. `database-sql/02_insert_data.sql`

### Bước 2: Cấu hình biến môi trường (`.env`)
Tạo file `backend/.env` (dựa theo mẫu `backend/.env.example`):
```env
DB_USER=sa
DB_PASSWORD=123456
DB_SERVER=localhost
DB_DATABASE=CoffeeChainSystem
PORT=5000
```

### Bước 3: Cài đặt thư viện & Chạy hệ thống
Mở Terminal tại thư mục dự án và chạy:
```bash
cd backend
npm install
npm start
```
👉 Mở trình duyệt truy cập: **`http://localhost:5000`** để trải nghiệm trọn vẹn 8 luồng nghiệp vụ ERP & POS!
