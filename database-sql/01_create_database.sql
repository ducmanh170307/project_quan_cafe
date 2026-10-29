CREATE DATABASE CoffeeChainSystem;
GO
USE CoffeeChainSystem;
GO

CREATE TABLE ChiNhanh (
    MaChiNhanh INT IDENTITY(1,1) PRIMARY KEY,
    TenChiNhanh NVARCHAR(150) NOT NULL,
    DiaChi NVARCHAR(255),
    SoDienThoai VARCHAR(20),
    TrangThai VARCHAR(20) DEFAULT 'open'
);

CREATE TABLE NhanVien (
    MaNhanVien INT IDENTITY(1,1) PRIMARY KEY,
    HoTen NVARCHAR(100) NOT NULL,
    VaiTro NVARCHAR(50),
    SoDienThoai VARCHAR(20),
    MaChiNhanh INT FOREIGN KEY REFERENCES ChiNhanh(MaChiNhanh)
);

CREATE TABLE NguyenLieu (
    MaNguyenLieu INT IDENTITY(1,1) PRIMARY KEY,
    TenNguyenLieu NVARCHAR(100) NOT NULL,
    DonViTinh NVARCHAR(30)
);

CREATE TABLE TonKhoChiNhanh (
    MaChiNhanh INT FOREIGN KEY REFERENCES ChiNhanh(MaChiNhanh),
    MaNguyenLieu INT FOREIGN KEY REFERENCES NguyenLieu(MaNguyenLieu),
    SoLuongTon INT DEFAULT 2000,
    MucTonToiThieu INT DEFAULT 200,
    PRIMARY KEY (MaChiNhanh, MaNguyenLieu)
);
GO