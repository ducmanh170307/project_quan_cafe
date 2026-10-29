/* ==========================================================================
   [PHẦN CỦA TRÚC - THÀNH VIÊN 3]
   LUỒNG 3 (BÁN HÀNG TẠI QUẦY POS & ONLINE) & LUỒNG 4 (ĐIỀU PHỐI PHA CHẾ KDS)
   ========================================================================== */
const TrucModule = {
    products: [
        { id: 1, name: 'Bạc Xỉu Đá (Size L)', price: 39000 },
        { id: 2, name: 'Trà Đào Cam Sả (Size M)', price: 45000 },
        { id: 3, name: 'Cà Phê Muối Huế', price: 35000 },
        { id: 4, name: 'Trà Sữa Ô Long Nướng', price: 42000 }
    ],
    cart: [],
    kdsOrders: [],

    init() {
        this.renderPosMenu();
    },

    renderPosMenu() {
        document.getElementById('posProductGrid').innerHTML = this.products.map(p => `
            <div class="card" style="padding:12px;">
                <b>${p.name}</b>
                <p style="color:var(--green-light); margin:6px 0; font-weight:700;">${p.price.toLocaleString()} đ</p>
                <button class="btn btn-green" style="width:100%;" onclick="TrucModule.addToCart(${p.id})">+ Chọn Món</button>
            </div>
        `).join('');
    },

    addToCart(id) {
        const prod = this.products.find(p => p.id === id);
        const existing = this.cart.find(c => c.id === id);
        if (existing) existing.qty++;
        else this.cart.push({ ...prod, qty: 1 });
        this.renderCart();
    },

    renderCart() {
        let total = 0;
        document.getElementById('posCartBody').innerHTML = this.cart.map(c => {
            total += c.price * c.qty;
            return `<tr><td>${c.name}</td><td>${c.qty}</td><td>${(c.price * c.qty).toLocaleString()} đ</td></tr>`;
        }).join('');
        document.getElementById('posTotalAmount').innerText = total.toLocaleString();
    },

    async checkoutPosOrder() {
        // Chặn thanh toán khi giỏ hàng đang trống theo đúng TC19 của Trúc
        if (this.cart.length === 0) {
            alert('Lỗi (TC19): Giỏ hàng đang trống, vui lòng chọn ít nhất 1 món trước khi thanh toán!');
            return;
        }

        const totalOrder = this.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        const orderId = '#DH' + Math.floor(1000 + Math.random() * 900);
        const detail = this.cart.map(c => `${c.name} (x${c.qty})`).join(', ');

        await ApiClient.post('/orders', {
            MaChiNhanh: ManhModule.currentBranchId,
            DanhSachMon: this.cart,
            TongTien: totalOrder
        });

        // Cộng doanh thu tiền mặt vào ca POS của Ý
        YModule.theoreticalMoney += totalOrder;
        document.getElementById('theoreticalCash').value = YModule.theoreticalMoney;

        this.kdsOrders.push({ orderId, detail, status: 'CHỜ PHA CHẾ' });
        this.cart = [];
        this.renderCart();
        this.renderKds();
        alert(`Tạo hóa đơn ${orderId} thành công! Lệnh pha chế đã đẩy xuống màn hình bếp KDS.`);
    },

    async submitOnlineOrder() {
        const customer = document.getElementById('onlineCustomerName').value.trim() || 'Khách Đặt Online';
        const item = document.getElementById('onlineProductSelect').value;
        const orderId = '#ONL' + Math.floor(100 + Math.random() * 900);

        await ApiClient.post('/orders/online', { customer, item });

        this.kdsOrders.push({ orderId, detail: `[${customer}] ${item}`, status: 'CHỜ PHA CHẾ' });
        this.renderKds();
        alert(`Đã nhận đơn Online ${orderId} và đồng bộ xuống màn hình bếp KDS!`);
    },

    async completeKdsOrder(index) {
        const order = this.kdsOrders[index];
        order.status = 'HOÀN TẤT (Đã trừ kho BOM)';

        await ApiClient.post('/kds/complete', { orderId: order.orderId });

        // Kích hoạt trừ tồn kho nguyên liệu theo định lượng BOM bên phân hệ của Linh (TC21)
        LinhModule.deductIngredientsFromKds();
        this.renderKds();
    },

    renderKds() {
        document.getElementById('kdsQueueBody').innerHTML = this.kdsOrders.map((o, idx) => `
            <tr>
                <td><b>${o.orderId}</b></td>
                <td>${o.detail}</td>
                <td><span class="badge-open">${o.status}</span></td>
                <td>
                    <button class="btn btn-green" onclick="TrucModule.completeKdsOrder(${idx})">
                        ✅ Hoàn Tất & Trừ Kho BOM
                    </button>
                </td>
            </tr>
        `).join('');
    }
};