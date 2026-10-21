const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./config/db');

// Import đầy đủ 8 bộ Routes theo chuẩn kiến trúc MVC
const branchRoutes = require('./routes/branchRoutes');       // Luồng 0: Quản lý Chuỗi Chi Nhánh
const hrRoutes = require('./routes/hrRoutes');               // Luồng 1: Nhân Sự, Phân Ca & Chấm Công
const shiftRoutes = require('./routes/shiftRoutes');         // Luồng 2 & 5: Mở Ca, Thu Chi & Đóng Ca
const orderRoutes = require('./routes/orderRoutes');         // Luồng 3 & 4: Bán Hàng POS & Đặt Online
const kdsRoutes = require('./routes/kdsRoutes');             // Luồng 3D & 3E: Màn Hình Pha Chế KDS
const productRoutes = require('./routes/productRoutes');     // Luồng 6: Quản Lý Thực Đơn (Menu)
const inventoryRoutes = require('./routes/inventoryRoutes'); // Luồng 7: Quản Lý Kho & Chuyển Kho
const promoRoutes = require('./routes/promoRoutes');         // Luồng 8: Khuyến Mãi & CRM

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Kết nối SQL Server
connectDB();

app.get('/', (req, res) => {
    res.send('☕ Hệ thống Quản trị Chuỗi Cà Phê ERP/POS Đa Chi Nhánh (Kiến trúc MVC) đang hoạt động!');
});

// Đăng ký các Routes theo từng phân hệ
app.use('/api/erp/branches', branchRoutes);
app.use('/api/erp/hr', hrRoutes);
app.use('/api/erp/shift', shiftRoutes);
app.use('/api/erp', orderRoutes);
app.use('/api/erp/kds', kdsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/erp/inventory', inventoryRoutes);
app.use('/api/erp/promotions', promoRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Server Chuỗi Cà Phê MVC đang chạy tại http://localhost:${PORT}`);
});