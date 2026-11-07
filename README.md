# DuAnCNPM-QuanLyChuoiCafe — phiên bản 4

Ứng dụng quản lý chuỗi cafe dùng Node.js/Express, SQL Server và JavaScript ES6 Modules. Bản này có **7 bộ Model/Controller/Route, 4 module giao diện, 20 bảng và 1 view KDS**. Đã loại bỏ chức năng kho, nguyên liệu, công thức BOM và trừ tồn khỏi giao diện, API, nghiệp vụ bán hàng và schema mới.

## Các chức năng chính

- **Nhân sự và phân ca:** mỗi chi nhánh mẫu có 8 nhân viên; chọn một hoặc nhiều người, ngày, vị trí và giờ cụ thể. Lịch tuần hỗ trợ sửa/hủy ca, sao chép tuần, xin/duyệt nghỉ và chấm công theo ca.
- **Thực đơn có ảnh:** đồ uống S/M/L và món ăn theo phần; ảnh JPG/PNG/WebP tải từ máy hoặc URL HTTP(S). Có sẵn 8 ảnh mẫu để chạy tại máy không cần tải ảnh từ mạng.
- **Voucher:** tạo mã giảm phần trăm hoặc số tiền, ngày hiệu lực, đơn tối thiểu, mức giảm tối đa, phạm vi chi nhánh và giới hạn lượt dùng. Áp dụng ở POS, đặt món online và khi thu tiền đơn online.
- **Bán hàng:** mở/chốt ca POS, thu chi nội bộ, giỏ hàng/topping, thu tiền, hóa đơn, hoàn tiền, KDS, khách hàng/tích điểm và báo cáo.

## Phân công nhóm

| Thành viên | Bộ MVC và file chung        | Giao diện                       | Trách nhiệm                                                |
| ---------- | --------------------------- | ------------------------------- | ---------------------------------------------------------- |
| Mạnh       | branch, hr; auth, db        | manhBranchHr.js, khung ứng dụng | Chi nhánh, tài khoản, phân ca/chấm công, tích hợp          |
| Ý          | shift, promo                | yShiftCashflow.js               | Ca POS, két/thu chi, voucher và CRM                        |
| Trúc       | order, kds                  | trucPosKds.js, customer.js      | POS, đơn online, thanh toán, KDS                           |
| Linh       | product; menuImage, billing | linhMenu.js, ảnh/CSS menu       | Menu đồ uống/món ăn, size/topping, ảnh và hiển thị hóa đơn |

Sau khi bỏ kho còn 7 bộ MVC; phần ảnh/menu và báo giá dùng chung được giao thêm cho Linh. Vai trò tài khoản dùng để phân quyền, còn **vị trí làm trong ca** là lựa chọn riêng khi xếp lịch.

## Cài đặt trong VS Code

Cần Node.js từ 22 trở lên và SQL Server 2017 trở lên. Giải nén toàn bộ ZIP, mở thư mục có `package.json` trong VS Code.

1. Trong SSMS, chạy `database-sql/01_create_database.sql`, sau đó `02_insert_data.sql`. Database mới là **CoffeeChainCafeV4**.
2. Tại terminal PowerShell ở thư mục gốc:

```powershell
Copy-Item backend\.env.example backend\.env
npm install
```

3. Điền kết nối SQL Server thật trong `backend/.env`, giữ `DB_DATABASE=CoffeeChainCafeV4`.
4. Kiểm tra và chạy:

```powershell
npm run db:check
npm start
```

Mở [http://localhost:5000](http://localhost:5000). Chủ chuỗi: **0900000000 / 999999**. Trang khách đặt món: [http://localhost:5000/order.html](http://localhost:5000/order.html).

Không mở trực tiếp `frontend/index.html` bằng Live Server; backend phục vụ cả API và giao diện. Xem `docs/HUONG_DAN_VSCODE.md` để có đầy đủ tài khoản và kịch bản sử dụng.

## Phân ca

Dữ liệu mẫu có 2 chi nhánh, mỗi chi nhánh 8 người: 1 quản lý, 2 thu ngân, 3 pha chế, 2 phục vụ. Chủ chuỗi là tài khoản toàn chuỗi riêng. **8 là số người mẫu, không phải giới hạn cứng**; có thể thêm nhân viên.

Trong tab Nhân sự, chọn tuần/ngày và các nhân viên, chọn vị trí Thu ngân/Pha chế/Phục vụ/Quản lý ca/Bếp, nhập giờ bắt đầu/kết thúc rồi lưu. Ví dụ người A làm Thu ngân 06:00–12:00, người B làm Pha chế 06:00–12:00, người C làm Phục vụ 12:00–18:00. Một người được có nhiều ca không chồng giờ. Ca qua đêm phải bật tùy chọn kết thúc hôm sau.

Server chặn người khác chi nhánh, tài khoản ngừng hoạt động, trùng lịch, ca quá dài và vượt số giờ. Mặc định tối đa 12 giờ/ca, 12 giờ/ngày, 48 giờ/tuần; điều chỉnh qua ba biến `SCHEDULE_MAX_*` trong `.env`. Ca tiếp nối như 06:00–12:00 và 12:00–16:00 được chấp nhận. Lịch xin nghỉ vẫn giữ chỗ đến khi quản lý duyệt; lịch đã chấm công không được sửa/hủy. Giờ nhập/hiển thị là giờ Việt Nam, dữ liệu thời điểm lưu UTC.

## Menu và voucher khi thanh toán

Chủ chuỗi quản lý menu: chọn loại Đồ uống hoặc Món ăn, danh mục, size/giá, ảnh rồi lưu. Món ăn dùng `PHAN`; đồ uống dùng S/M/L và có thể thêm topping. Ảnh tải lên tối đa 2 MB, được lưu tại `backend/uploads/menu`; cần giữ thư mục này khi sao lưu dữ liệu ứng dụng. Ảnh mẫu và nguồn ảnh nằm trong `docs/ANH_MENU.md`.

Trong tab Voucher/CRM, chủ chuỗi hoặc quản lý tạo mã. Tại POS, chọn/nhập mã và bấm Áp dụng. Hóa đơn hiển thị **tạm tính → giảm giá → phải thu** trước khi thu tiền. Server tự tính lại theo giá/điều kiện thật; nếu giá hoặc voucher thay đổi trong lúc thanh toán, yêu cầu báo giá lại.

Ví dụ: 2 Bạc xỉu M 39.000đ, mỗi ly thêm sữa 5.000đ = 88.000đ. Mã `CAFE10` giảm 10% = 8.800đ; phải thu 79.200đ, khách đưa 100.000đ thì trả 20.800đ. Với ca mở 1.000.000đ và không có giao dịch khác, két lý thuyết là 1.079.200đ.

Mỗi đơn áp dụng tối đa một mã. Xem trước và tạo đơn online chưa thu tiền không tiêu lượt voucher; thu tiền thành công mới tăng một lượt trong cùng transaction. Gửi lại thanh toán không tăng lượt lần nữa. Voucher của đơn online được kiểm tra lại lúc thu tiền; thu ngân có thể đổi/bỏ mã. Hoàn tiền không trả lại lượt đã sử dụng theo quy tắc của bản này.

## Luồng tiền và KDS

Mở ca → tạo đơn/thu tiền → KDS pha chế/chế biến → hoàn tất → chốt ca. Đơn online chưa thu tiền chờ tại POS, sau khi thu mới vào KDS. KDS hỗ trợ ghi nhận số lượng hoàn tất/làm lại và không còn bước xử lý kho.

Két lý thuyết = tiền đầu ca + thu CASH − hoàn CASH + thu nội bộ − chi nội bộ. Giao dịch thẻ/chuyển khoản không cộng vào két. Hoàn đơn đã trả cần quyền quản lý và ca gốc còn mở.

## Database và kiểm thử

Schema/seed đều là phiên bản 4. Hai script có thể chạy lại cùng phiên bản mà không nhân đôi dữ liệu mẫu hoặc đặt lại PIN. Script từ chối schema khác phiên bản. Dùng trọn bộ code và SQL v4; database `CoffeeChainCafeV4` tách khỏi bản dự án cũ, không tự di chuyển dữ liệu cũ. Các bảng kho của database cũ không được sử dụng; schema mới không tạo chúng.

```powershell
npm run check
npm test
npm run test:sql
```

`check` kiểm tra cú pháp/import/tài nguyên. `npm test`: **60 kiểm thử tự động đã đạt**, dùng tầng SQL giả lập. Đã kiểm tra **20 nhóm thao tác trình duyệt** với API fixture. Chưa chạy với SQL Server thật trong môi trường soạn mã; `test:sql` tạo database test riêng để nhóm xác nhận schema/seed và giao dịch thật. Xem `docs/KIEM_THU.md`.

Thanh toán thẻ/chuyển khoản hiện do thu ngân xác nhận thủ công; chưa tích hợp cổng thanh toán, hóa đơn điện tử hay tính lương chính thức. Chấm công theo ca không xác minh vị trí GPS thực tế.
