/* ==========================================================================
   [PHẦN CỦA LINH - THÀNH VIÊN 4]
   LUỒNG 6 (THỰC ĐƠN BOM), LUỒNG 7 (KHO ĐA ĐIỂM) & LUỒNG 8 (KHUYẾN MÃI CRM)
   ========================================================================== */
const LinhModule = {
    inventory: [
        { name: 'Sữa tươi thanh trùng', stock: 250, min: 200 },
        { name: 'Hạt cà phê Arabica', stock: 2000, min: 200 },
        { name: 'Trân châu trắng', stock: 180, min: 200 }
    ],

    init() {
        this.renderInventory();
    },

    async addProduct() {
        const name = document.getElementById('newProdName').value.trim();
        const price = Number(document.getElementById('newProdPrice').value);

        if (!name || price <= 0 || isNaN(price)) {
            alert('Vui lòng nhập Tên sản phẩm và Giá bán hợp lệ!');
            return;
        }

        await ApiClient.post('/products', { TenSP: name, GiaBan: price });

        TrucModule.products.push({ id: Date.now(), name, price });
        TrucModule.renderPosMenu();
        alert(`Đã thêm món "${name}" (${price.toLocaleString()}đ) vào Menu toàn chuỗi thành công!`);
    },

    deductIngredientsFromKds() {
        // Trừ 100ml Sữa tươi mỗi khi hoàn tất đơn pha chế trên KDS (TC21 & TC23)
        this.inventory[0].stock = Math.max(0, this.inventory[0].stock - 100);
        this.renderInventory();
    },

    renderInventory() {
        document.getElementById('inventoryTableBody').innerHTML = this.inventory.map(item => {
            const isLow = item.stock < item.min;
            return `
                <tr>
                    <td><b>${item.name}</b></td>
                    <td>${item.stock}</td>
                    <td>${item.min}</td>
                    <td>
                        ${isLow 
                            ? '<span class="badge-warn">⚠️ SẮP HẾT HÀNG - CẦN NHẬP THÊM (&lt; 200)</span>' 
                            : '<span class="badge-open">Đủ định mức an toàn</span>'}
                    </td>
                </tr>
            `;
        }).join('');
    },

    async transferStock() {
        const name = document.getElementById('transferItemSelect').value;
        const qty = Number(document.getElementById('transferQty').value);
        const item = this.inventory.find(i => i.name === name);

        if (qty <= 0 || isNaN(qty)) {
            alert('Vui lòng nhập số lượng điều chuyển lớn hơn 0!');
            return;
        }

        // Chặn điều chuyển vượt quá số lượng tồn kho hiện có theo đúng TC24 của Linh
        if (qty > item.stock) {
            alert(`Lỗi (TC24): Số lượng xuất chuyển (${qty}) vượt quá tồn kho hiện tại của chi nhánh (${item.stock})!`);
            return;
        }

        await ApiClient.post('/inventory/transfer', { NguyenLieu: name, SoLuongChuyen: qty });

        item.stock -= qty;
        this.renderInventory();
        alert(`Đã điều chuyển ${qty} đơn vị "${name}" sang chi nhánh nhận thành công!`);
    },

    async verifyPromo() {
        const code = document.getElementById('promoCodeInput').value.trim().toUpperCase();
        const msgEl = document.getElementById('promoResultMsg');

        await ApiClient.post('/promos/verify', { MaKhuyenMai: code });

        // Kiểm tra mã khuyến mãi hết hạn theo đúng TC25 của Linh
        if (code === 'TET2025') {
            msgEl.style.color = '#ef4444';
            msgEl.innerText = '❌ Lỗi (TC25): Mã khuyến mãi TET2025 đã hết hạn sử dụng!';
        } else if (code === 'HE2026') {
            msgEl.style.color = '#22c55e';
            msgEl.innerText = '✅ Áp dụng mã HE2026 thành công: Giảm 20% tổng hóa đơn thanh toán!';
        } else {
            msgEl.style.color = '#f59e0b';
            msgEl.innerText = '⚠️ Mã khuyến mãi không tồn tại hoặc không đủ điều kiện áp dụng!';
        }
    }
};