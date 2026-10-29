const ProductModel = require('../models/productModel');

const getProducts = async (req, res) => {
    try {
        const { page, limit, search, sortBy, sortType } = req.query;
        const result = await ProductModel.getAllProducts(page, limit, search, sortBy, sortType);
        
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách sản phẩm' });
    }
};

const createProduct = async (req, res) => {
    try {
        const { MaDanhMuc, TenSanPham, GiaBan, HinhAnh } = req.body;
        if (!MaDanhMuc || !TenSanPham || !GiaBan) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
        }
        await ProductModel.addProduct({ MaDanhMuc, TenSanPham, GiaBan, HinhAnh });
        res.status(201).json({ success: true, message: 'Thêm sản phẩm thành công!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi khi thêm sản phẩm' });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const productData = req.body;
        await ProductModel.updateProduct(id, productData);
        res.status(200).json({ success: true, message: 'Cập nhật sản phẩm thành công!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật sản phẩm' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        // Sửa dòng này: Dùng parseInt để biến chữ thành số nguyên
        const id = parseInt(req.params.id, 10);
        const { type } = req.query;
        
        await ProductModel.deleteProduct(id, type);
        res.status(200).json({ success: true, message: 'Xóa sản phẩm thành công!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi khi xóa sản phẩm' });
    }
};

module.exports = {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct
};