# Kịch bản chạy demo trước khi thuyết trình

Thầy dặn: **trước khi thuyết trình phải có một kịch bản chạy, mỗi bước chạy phần nào.** Tài liệu này là kịch bản đó. Chạy thử trọn một lượt trước buổi báo cáo, mỗi người nắm bước của mình.

## 0. Chuẩn bị (làm trước buổi báo cáo)

1. Trong SSMS chạy `database-sql/01_create_database.sql` rồi `02_insert_data.sql`. Nếu đã có database v4 từ trước, vẫn chạy lại được: script tự thêm cột **Đối tượng áp dụng** cho voucher và 4 voucher mẫu mới.
2. `npm run check`, `npm test`, `npm run db:check`, sau đó `npm start`, mở http://localhost:5000.
3. Voucher mẫu sau khi chạy seed:

| Mã | Tình trạng | Đối tượng | Dùng để demo |
| --- | --- | --- | --- |
| `CAFE10` | Đang chạy | Mọi khách | Giảm 10%, đơn từ 50.000đ, tối đa 30.000đ |
| `WELCOME20` | Đang chạy | Mọi khách | Giảm 20.000đ, đơn từ 100.000đ, 100 lượt |
| `THANHVIEN15` | Đang chạy | **Khách thành viên** | Giảm 15%, đơn từ 60.000đ, tối đa 30.000đ |
| `TAMTAT5K` | **Đã tắt** | Mọi khách | Không hiện ở POS |
| `HETHAN` | **Hết hạn** | Mọi khách | Không hiện ở POS |
| `SAPDIENRA` | **Sắp diễn ra** | Mọi khách | Không hiện ở POS |

4. Tài khoản dùng trong kịch bản (chi nhánh Cầu Giấy):

| Vai trò | Điện thoại / PIN |
| --- | --- |
| Quản lý | 0901000001 / 999911 |
| Thu ngân 1 | 0902000001 / 111111 |
| Pha chế 1 | 0903000001 / 222222 |

5. Chuẩn bị sẵn một ca làm cho thu ngân 1 bắt đầu trong vòng 30 phút tới (Nhân sự → Lịch phân ca → chọn người → Lưu). Nếu không, bước Check-in sẽ báo "Chưa có ca phù hợp vào lúc này"; đây là quy tắc đúng, không phải lỗi.

## 1. Kịch bản từng bước

| # | Ai trình bày | Đăng nhập | Thao tác | Kết quả cần thấy |
| --- | --- | --- | --- | --- |
| 1 | Mạnh | Quản lý | Tab **Nhân sự & chấm công** → mục **① Lịch phân ca**. Đánh dấu 2 nhân viên, chọn **Từ ngày – Đến ngày** của tuần, bấm **Thứ 2–6**, rồi Lưu | Dòng bên dưới ghi rõ "Đã chọn 2 người ... Sẽ tạo 10 ca (2 người × 5 ngày: T2 .., T3 ..)". Lưu xong lịch tuần có đủ 10 ca |
| 2 | Mạnh | Quản lý | Chuyển sang **③ Tài khoản nhân viên** | Danh sách tài khoản và vai trò, tách hẳn khỏi lịch ca |
| 3 | Mạnh | Thu ngân 1 | Đăng nhập → **② Chấm công** → "Ca làm của tôi hôm nay" → **Check-in cho tôi** | Trạng thái: "Đang làm việc từ HH:mm". Giải thích: đăng nhập chỉ vào hệ thống, check-in mới tính giờ công |
| 4 | Ý | Thu ngân 1 | Tab **Mở ca & chốt ca** | Dải trạng thái "chưa có ca mở"; thanh bước **① Mở ca** sáng; thu chi và chốt ca bị ẩn |
| 5 | Ý | Thu ngân 1 | (Chỉ khi đã có ca trước đó, làm sau lần demo thứ hai) Nhập tiền đầu ca khác tiền chốt ca trước, để trống lý do, bấm Mở ca | Báo lỗi bắt buộc ghi lý do lệch |
| 6 | Ý | Thu ngân 1 | Nhập 1.000.000đ (hoặc đúng số gợi ý), bấm **Mở ca** | Dải trạng thái xanh "Ca #n đang mở"; form mở ca ẩn; hiện thu chi và chốt ca |
| 7 | Ý | Thu ngân 1 | **② Thu chi**: Chi 50.000đ, lý do "Mua đá" | Phiếu hiện trong bảng; két lý thuyết còn 950.000đ |
| 8 | Trúc | Thu ngân 1 | Tab **Bán hàng POS**, bấm thanh danh mục **Cà phê** | Chỉ còn món thuộc danh mục Cà phê |
| 9 | Trúc | Thu ngân 1 | Bấm **Bạc xỉu M** → hộp chọn: đường **50%**, đá **0%**, topping **Thêm sữa ×1** → Thêm vào giỏ. Bấm tiếp lần nữa với đúng lựa chọn đó | Dòng "Đã chọn: đường 50% · đá 0% · topping: Thêm sữa ×1 (+5.000đ)" trong hộp chọn. Giỏ có 1 dòng **số lượng 2**, hiện "Đường 50% · Đá 0% · Thêm sữa ×1" |
| 10 | Trúc | Thu ngân 1 | Bấm **Trà sữa ô long M** → đường 30%, đá 50%, topping **Trân châu trắng** bấm + hai lần → Thêm vào giỏ | Giỏ có 2 dòng khác nhau; tạm tính **146.000đ** (88.000 + 58.000) |
| 11 | Ý | Thu ngân 1 | Chọn voucher `THANHVIEN15` khi **chưa nhập SĐT** | Hiện điều kiện "chỉ khách thành viên" và báo lỗi cần nhập số điện thoại |
| 12 | Ý | Thu ngân 1 | Nhập SĐT khách `0912345678` → Áp dụng `THANHVIEN15` | Giảm **21.900đ**, phải thu **124.100đ** |
| 13 | Trúc | Thu ngân 1 | Thanh toán tiền mặt, khách đưa 150.000đ | Tiền thừa **25.900đ**; hóa đơn hiển thị đường/đá/topping từng món |
| 14 | Trúc | Pha chế 1 | Tab **Pha chế / bếp** | Đơn hiện đủ đường, đá, topping, ghi chú; bấm **Hoàn tất & giao món** |
| 15 | Ý | Quản lý | Tab **Khuyến mãi & CRM** | Dải đếm: Đang chạy 3 · Sắp diễn ra 1 · Đã tắt 1 · Hết hạn/hết lượt 1. `THANHVIEN15` đã dùng 1 lượt |
| 16 | Ý | Quản lý | Dùng bộ lọc: **Chỉ đã tắt**, rồi **Đã hết hạn**, rồi **Sắp diễn ra**, rồi đối tượng **Khách thành viên** | Mỗi lần bảng chỉ còn đúng voucher tương ứng |
| 17 | Ý | Quản lý | Bấm **Tắt voucher** với `CAFE10`, bấm Tải lại, sang POS | `CAFE10` không còn trong danh sách ưu đãi |
| 18 | Ý | Thu ngân 1 | **③ Chốt ca**: nhập thực đếm 1.074.100đ | "Khớp với tiền lý thuyết". Két = 1.000.000 − 50.000 + 124.100 = **1.074.100đ**. Bấm Đóng ca |
| 19 | Ý | Thu ngân 1 | Quay lại **Mở ca** | Dải trạng thái "chưa có ca mở"; tiền đầu ca được gợi ý sẵn **1.074.100đ** (bằng tiền chốt ca trước) |
| 20 | Mạnh | Thu ngân 1 | Bấm **Đăng xuất** khi chưa Check-out | Hộp xác nhận "Bạn chưa Check-out ca làm. Vẫn đăng xuất?" |
| 21 | Linh | Khách | Mở `/order.html`, đặt đồ uống với cùng hộp chọn đường/đá/topping | Đơn online chờ thu tại quầy; giỏ hiển thị đúng lựa chọn |

## 2. Giải thích logic khi thầy hỏi

- **Vì sao tách đăng nhập và chấm công?** Đăng nhập là xác thực vào hệ thống và phân quyền. Chấm công ghi giờ làm theo ca đã xếp (check-in được sớm tối đa 30 phút). Nhân viên chỉ chấm công cho chính mình; quản lý chấm công thay được.
- **Mở ca hoạt động thế nào?** Mỗi chi nhánh chỉ có một ca mở. Chưa có ca mở thì POS bị chặn và hiện lời nhắc "Đi tới mở ca". Tiền đầu ca nên bằng tiền thực đếm của ca trước; nếu lệch phải ghi lý do. Có ca mở thì ẩn form mở ca, chỉ còn thu chi và chốt ca. Muốn chốt ca phải hoàn tất hết đơn ở màn hình Pha chế.
- **Topping, đường, đá được tính thế nào?** Mức đường (0/30/50/70/100%) và đá (0/50/100%) lưu theo từng dòng món để pha chế làm đúng. Mỗi loại topping chọn 1–5 phần; giá = giá món + tổng giá topping × số phần. Server tự tính lại giá, không tin giá từ trình duyệt.
- **Voucher áp dụng cho ai?** Khi tạo chọn *Mọi khách* hoặc *Chỉ khách thành viên*. Voucher thành viên yêu cầu nhập SĐT; server kiểm tra lại khi báo giá, tạo đơn và thu tiền. Voucher chỉ hiện ở POS khi đang bật, trong thời hạn, còn lượt và đúng chi nhánh.

## 3. Nếu demo gặp sự cố

| Hiện tượng | Xử lý |
| --- | --- |
| "Chưa có ca phù hợp" khi Check-in | Thêm ca cho người đó bắt đầu trong 30 phút tới, rồi check-in lại |
| "Chi nhánh đang có phiên ca mở" | Có ca chưa chốt từ lần demo trước; chốt ca đó rồi mở lại |
| Không thấy voucher mẫu mới | Chưa chạy lại `02_insert_data.sql`; chạy lại (an toàn, không nhân đôi dữ liệu) |
| Lỗi cột `DoiTuongApDung` | Chưa chạy lại `01_create_database.sql`; chạy lại để thêm cột |
