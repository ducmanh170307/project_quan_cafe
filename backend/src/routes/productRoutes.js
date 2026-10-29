const express = require('express');
const router = express.Router();
const { 
    getProducts, 
    createProduct, 
    updateProduct, 
    deleteProduct 
} = require('../controllers/productController');

// Lấy danh sách (hỗ trợ phân trang, tìm kiếm, lọc)
router.get('/', getProducts);

// Thêm sản phẩm
router.post('/', createProduct);

// Sửa sản phẩm
router.put('/:id', updateProduct);

// Xóa sản phẩm
router.delete('/:id', deleteProduct);

module.exports = router;