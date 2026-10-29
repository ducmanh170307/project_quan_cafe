const { sql, connectDB } = require('../config/db');

// Lấy danh sách sản phẩm (Kèm phân trang, tìm kiếm, sắp xếp)
const getAllProducts = async (page = 1, limit = 5, search = '', sortBy = 'MaSanPham', sortType = 'DESC') => {
    try {
        const pool = await connectDB();
        const offset = (page - 1) * limit;

        const validSortCols = ['MaSanPham', 'TenSanPham', 'GiaBan', 'GiaBanCoBan'];
        const sortColumn = validSortCols.includes(sortBy) ? (sortBy === 'GiaBan' ? 'GiaBanCoBan' : sortBy) : 'MaSanPham';
        const sortOrder = sortType.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const request = pool.request();
        request.input('search', sql.NVarChar, `%${search}%`);
        request.input('offset', sql.Int, parseInt(offset));
        request.input('limit', sql.Int, parseInt(limit));

        const dataQuery = `
            SELECT sp.MaSanPham, sp.MaDanhMuc, dm.TenDanhMuc, sp.TenSanPham, 
                   sp.GiaBanCoBan AS GiaBan, sp.HinhAnh, sp.TramPhaChe, sp.TrangThai
            FROM SanPham sp
            LEFT JOIN DanhMuc dm ON sp.MaDanhMuc = dm.MaDanhMuc
            WHERE sp.TenSanPham LIKE @search AND sp.TrangThai != 'hidden'
            ORDER BY sp.${sortColumn} ${sortOrder}
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `;

        const countQuery = `
            SELECT COUNT(*) AS total 
            FROM SanPham 
            WHERE TenSanPham LIKE @search AND TrangThai != 'hidden'
        `;

        const dataResult = await request.query(dataQuery);
        const countResult = await pool.request()
            .input('search', sql.NVarChar, `%${search}%`)
            .query(countQuery);

        return {
            products: dataResult.recordset,
            total: countResult.recordset[0].total
        };
    } catch (error) {
        throw error;
    }
};

// Lấy 1 sản phẩm theo ID
const getProductById = async (id) => {
    try {
        const pool = await connectDB();
        const result = await pool.request()
            .input('MaSanPham', sql.Int, id)
            .query(`SELECT MaSanPham, MaDanhMuc, TenSanPham, GiaBanCoBan AS GiaBan, HinhAnh, TramPhaChe, TrangThai FROM SanPham WHERE MaSanPham = @MaSanPham`);
        return result.recordset[0];
    } catch (error) {
        throw error;
    }
};

// Thêm sản phẩm mới (Luồng 6)
const createProduct = async (product) => {
    try {
        const pool = await connectDB();
        const request = pool.request();
        request.input('MaDanhMuc', sql.Int, product.MaDanhMuc);
        request.input('TenSanPham', sql.NVarChar, product.TenSanPham);
        request.input('GiaBanCoBan', sql.Decimal(12, 2), product.GiaBan);
        request.input('HinhAnh', sql.VarChar, product.HinhAnh || '');
        request.input('TramPhaChe', sql.VarChar, product.TramPhaChe || 'Tea_Smoothie_Bar');

        await request.query(`
            INSERT INTO SanPham (MaDanhMuc, TenSanPham, GiaBanCoBan, HinhAnh, TramPhaChe, TrangThai)
            VALUES (@MaDanhMuc, @TenSanPham, @GiaBanCoBan, @HinhAnh, @TramPhaChe, 'active')
        `);
    } catch (error) {
        throw error;
    }
};

// Cập nhật sản phẩm (Luồng 6)
const updateProduct = async (id, product) => {
    try {
        const pool = await connectDB();
        const request = pool.request();
        request.input('MaSanPham', sql.Int, id);
        request.input('MaDanhMuc', sql.Int, product.MaDanhMuc);
        request.input('TenSanPham', sql.NVarChar, product.TenSanPham);
        request.input('GiaBanCoBan', sql.Decimal(12, 2), product.GiaBan);
        request.input('HinhAnh', sql.VarChar, product.HinhAnh || '');
        request.input('TrangThai', sql.VarChar, product.TrangThai || 'active');

        await request.query(`
            UPDATE SanPham 
            SET MaDanhMuc = @MaDanhMuc, 
                TenSanPham = @TenSanPham, 
                GiaBanCoBan = @GiaBanCoBan, 
                HinhAnh = @HinhAnh, 
                TrangThai = @TrangThai
            WHERE MaSanPham = @MaSanPham
        `);
    } catch (error) {
        throw error;
    }
};

// Xóa sản phẩm - Xóa mềm chuyển sang 'hidden' (Luồng 6)
const deleteProduct = async (id, type = 'soft') => {
    try {
        const pool = await connectDB();
        const request = pool.request();
        request.input('MaSanPham', sql.Int, id);

        if (type === 'hard') {
            await request.query(`DELETE FROM SanPham WHERE MaSanPham = @MaSanPham`);
        } else {
            await request.query(`UPDATE SanPham SET TrangThai = 'hidden' WHERE MaSanPham = @MaSanPham`);
        }
    } catch (error) {
        throw error;
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};