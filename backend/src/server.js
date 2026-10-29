const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Phục vụ toàn bộ thư mục frontend/ (index.html, src/assets, src/modules)
app.use(express.static(path.join(__dirname, '../../frontend')));

// Gắn kết 8 Routes của 4 thành viên (Mạnh, Ý, Trúc, Linh)
app.use('/api/branches', require('./routes/branchRoutes'));       // Mạnh
app.use('/api/hr', require('./routes/hrRoutes'));                 // Mạnh
app.use('/api/shifts', require('./routes/shiftRoutes'));           // Ý
app.use('/api/orders', require('./routes/orderRoutes'));           // Trúc
app.use('/api/kds', require('./routes/kdsRoutes'));                 // Trúc
app.use('/api/products', require('./routes/productRoutes'));       // Linh
app.use('/api/inventory', require('./routes/inventoryRoutes'));   // Linh
app.use('/api/promos', require('./routes/promoRoutes'));           // Linh

// Mặc định trả về giao diện frontend/index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server KiotCafe ERP & POS đang chạy tại: http://localhost:${PORT}`);
});