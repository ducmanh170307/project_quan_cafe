USE CoffeeChainSystem;
GO

INSERT INTO ChiNhanh (TenChiNhanh, DiaChi, SoDienThoai, TrangThai) VALUES
(N'Chi nhánh Cầu Giấy - Hà Nội', N'122 Cầu Giấy, Hà Nội', '0988111222', 'open'),
(N'Chi nhánh Hà Đông - Hà Nội', N'45 Nguyễn Trãi, Hà Đông', '0988333444', 'open');

INSERT INTO NguyenLieu (TenNguyenLieu, DonViTinh) VALUES
(N'Sữa tươi thanh trùng', N'ml'),
(N'Hạt cà phê Arabica', N'gram'),
(N'Trân châu trắng', N'gram');

INSERT INTO TonKhoChiNhanh (MaChiNhanh, MaNguyenLieu, SoLuongTon, MucTonToiThieu)
SELECT cn.MaChiNhanh, nl.MaNguyenLieu, 2000, 200
FROM ChiNhanh cn CROSS JOIN NguyenLieu nl;

INSERT INTO NhanVien (HoTen, VaiTro, SoDienThoai, MaChiNhanh) VALUES
(N'Nguyễn Quản Lý (Cầu Giấy)', N'Quản lý', '0901000001', 1),
(N'Trần Thu Ngân (Cầu Giấy)', N'Thu ngân', '0902000001', 1),
(N'Lê Barista (Cầu Giấy)', N'Pha chế', '0903000001', 1),
(N'Phạm Quản Lý (Hà Đông)', N'Quản lý', '0901000002', 2),
(N'Hoàng Thu Ngân (Hà Đông)', N'Thu ngân', '0902000002', 2),
(N'Vũ Barista (Hà Đông)', N'Pha chế', '0903000002', 2);
GO