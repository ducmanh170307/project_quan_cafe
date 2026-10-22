# ☕ Hệ Thống Quản Trị Chuỗi Cà Phê Toàn Diện (Enterprise ERP & POS)
**Môn học:** Công Nghệ Phần Mềm | **Kiến trúc:** Modular MVC (Node.js + Express + SQL Server)

---

## 📂 Cấu Trúc Khung Dự Án & Phân Công Tải File Lên GitHub

Hiện tại Repository đã được khởi tạo **Bộ khung lõi (Core Framework)**. Các thành viên trong nhóm vui lòng tải các file phụ trách của mình lên đúng thư mục `models/`, `controllers/` và `routes/` theo bảng phân công dưới đây:

| Thành viên | Vai trò | Phân hệ phụ trách | Các file cần tải lên GitHub | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **1. Trần Đức Mạnh** | Nhóm trưởng | **Luồng 0 & 1:** Chuỗi Chi Nhánh, Phân Ca & Chấm Công + Khung Hệ Thống | `config/db.js`, `server.js`,`models/branchModel.js`, `models/hrModel.js`<br>`controllers/branchController.js`, `controllers/hrController.js`<br>`routes/branchRoutes.js`, `routes/hrRoutes.js` | ✅ Hoàn Thành |
| **2. Ý** | Thành viên | **Luồng 2 & 5:** Mở Ca POS, Thu Chi Nội Bộ & Đối Soát Két | `models/shiftModel.js`<br>`controllers/shiftController.js`<br>`routes/shiftRoutes.js``index.html`| ✅ Hoàn Thành |
| **3. Trúc** | Thành viên | **Luồng 3 & 4:** Bán Hàng POS, Đặt Online & Pha Chế KDS | `models/orderModel.js`, `models/kdsModel.js`<br>`controllers/orderController.js`, `controllers/kdsController.js`<br>`routes/orderRoutes.js`, `routes/kdsRoutes.js` | ✅ Hoàn Thành |
| **4. Linh** | Thành viên | **Luồng 6, 7 & 8:** Quản Lý Menu, Nhập/Chuyển Kho & Khuyến Mãi CRM | `models/productModel.js`, `models/inventoryModel.js`, `models/promoModel.js`<br>`controllers/productController.js`, `controllers/inventoryController.js`, `controllers/promoController.js`<br>`routes/productRoutes.js`, `routes/inventoryRoutes.js`, `routes/promoRoutes.js` | ✅ Hoàn Thành |

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án (Sau khi đủ file)
1. Cài đặt thư viện: `npm install`
2. Chạy file SQL khởi tạo 26 bảng cơ sở dữ liệu `CoffeeChainSystem`.
3. Tạo file `.env` cấu hình tài khoản SQL Server.
4. Khởi động Server: `node server.js`
