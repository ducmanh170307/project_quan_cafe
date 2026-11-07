# Hướng dẫn sao chép, chạy và trình diễn bản v4

## Chuẩn bị source

Cách nhanh nhất là giải nén `DuAnCNPM-QuanLyChuoiCafe.zip`, mở đúng thư mục có `package.json` trong VS Code. Nếu muốn tự tạo từng file, mở `Code_Tung_File_QuanLyChuoiCafe.html` bằng Chrome/Edge: chọn đường dẫn → Sao chép toàn bộ → dán vào file cùng đường dẫn. Nút Tải riêng file tải nguyên nội dung.

Bản Markdown chứa đầy đủ nội dung các file văn bản. Không sao chép tên đường dẫn hoặc hàng rào Markdown vào code. Với các file JPG, dùng nút tải ảnh của bản HTML hoặc lấy từ ZIP, không dán chữ vào file ảnh. Giữ đúng tên và đường dẫn ảnh trong `frontend/src/assets/menu/`.

Các toán tử `...` trong JavaScript là cú pháp spread/rest, cần giữ lại. Tạo đủ `lib`, `middleware`, `app.js`, `main.js` và các file dịch vụ vì code có import chúng. Bản v4 còn 7 model/controller/route và frontend `linhMenu.js`; bỏ các file inventory và module cũ nếu chép đè từ bản trước.

## Tạo database và cấu hình

1. Dùng SSMS mở kết nối SQL Server của máy, chạy hai script theo thứ tự 01 → 02. CSDL là **CoffeeChainCafeV4**.
2. Mở PowerShell tại thư mục gốc:

```powershell
Copy-Item backend\.env.example backend\.env
npm install
```

3. Sửa `backend/.env`, ví dụ SQL Server dùng cổng cố định:

```dotenv
PORT=5000
HOST=127.0.0.1
DB_SERVER=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=MAT_KHAU_THAT_CUA_BAN
DB_DATABASE=CoffeeChainCafeV4
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
COOKIE_SECURE=false
```

Nếu SSMS hiển thị `TENMAY\MSSQLSERVER01`, cấu hình named instance:

```dotenv
DB_SERVER=TENMAY\MSSQLSERVER01
DB_PORT=
```

Backend dùng SQL Server Authentication. `PORT=5000` là cổng web, `DB_PORT` là cổng SQL. Không dùng PIN đăng nhập ứng dụng thay cho mật khẩu SQL Server.

4. Chạy:

```powershell
npm run db:check
npm start
```

Mở [http://localhost:5000](http://localhost:5000). `npm run dev` tự khởi động lại khi sửa backend. Dừng bằng Ctrl+C. Giao diện không chạy bằng cách bấm đúp `index.html` hoặc Live Server.

## Tài khoản mẫu

Chủ chuỗi: **0900000000 / 999999**, không thuộc danh sách 8 người của chi nhánh.

| Nhân viên  | Cầu Giấy: điện thoại / PIN | Hà Đông: điện thoại / PIN |
| ---------- | -------------------------- | ------------------------- |
| Quản lý    | 0901000001 / 999911        | 0901000002 / 999922       |
| Thu ngân 1 | 0902000001 / 111111        | 0902000002 / 333333       |
| Pha chế 1  | 0903000001 / 222222        | 0903000002 / 444444       |
| Thu ngân 2 | 0902100001 / 111112        | 0902100002 / 333334       |
| Pha chế 2  | 0903100001 / 222223        | 0903100002 / 444445       |
| Pha chế 3  | 0903200001 / 222224        | 0903200002 / 444446       |
| Phục vụ 1  | 0904000001 / 555551        | 0904000002 / 666661       |
| Phục vụ 2  | 0904100001 / 555552        | 0904100002 / 666662       |

Dữ liệu mẫu có sẵn lịch từ thứ Hai đến thứ Bảy của tuần chạy seed lần đầu. Quản lý/nhân viên chỉ thao tác trong chi nhánh của mình; chủ chuỗi đổi chi nhánh ở đầu trang. Nhân viên thường chỉ xem lịch/chấm công của mình. Đổi PIN sẽ hủy phiên đăng nhập cũ.

## Phân ca cho 8 nhân viên

1. Đăng nhập chủ chuỗi hoặc quản lý, chọn chi nhánh rồi mở tab Nhân sự.
2. Chọn tuần cần sắp xếp. Lưới có một hàng cho mỗi người, các cột từ thứ Hai đến Chủ nhật. Nút + Ca mở sẵn ngày/người tương ứng.
3. Đánh dấu một hay nhiều nhân viên, nhập ngày, vị trí, giờ bắt đầu và kết thúc; có thể chọn ca mẫu rồi sửa giờ.
4. Chọn Thu ngân, Pha chế, Phục vụ, Quản lý ca hoặc Bếp. Đây là công việc trong ca, độc lập với quyền tài khoản.
5. Ví dụ 2 người cùng làm Phục vụ 13:15–17:45: chọn đúng 2 người và lưu một lần. Nếu một người bị trùng lịch thì toàn bộ lần lưu bị từ chối để sửa lại.
6. Ca qua đêm 22:00–02:00 phải bật kết thúc vào ngày hôm sau. Dùng nút Sửa/Hủy trên từng ca; hủy cần lý do. Ca đã chấm công giữ nguyên để đối chiếu.
7. Sao chép tuần chọn thứ Hai của tuần đích. Nếu có bất kỳ ca trùng/vi phạm giờ, không tạo một phần lịch.

Mặc định giới hạn 12 giờ/ca, 12 giờ/ngày và 48 giờ/tuần. Điều chỉnh trong `.env` rồi khởi động lại nếu quy định của nhóm khác. Người đang xin nghỉ vẫn giữ ca; quản lý duyệt nghỉ mới giải phóng khoảng giờ. Không được vô hiệu hóa nhân viên còn ca chưa kết thúc.

Chấm công chọn nhân viên và Check-in/Check-out. Server chọn đúng ca đang đến giờ; cho check-in sớm tối đa 30 phút, không cho tạo hai phiên chấm công đang mở. Số giờ, phút muộn/về sớm lấy từ thời gian thực. Tài khoản nhân viên chỉ chấm công cho bản thân.

## Thêm món có ảnh

Chủ chuỗi mở tab Menu, tạo/chỉnh sản phẩm, chọn loại Đồ uống hoặc Món ăn. Đồ uống có size S/M/L; món ăn theo PHAN. Nhập giá, danh mục, tải ảnh JPG/PNG/WebP tối đa 2 MB hoặc dán URL HTTP(S), xem trước rồi lưu. Ảnh mẫu có sẵn trong source; nguồn ảnh ghi ở `ANH_MENU.md`.

POS và trang khách đều hiển thị ảnh, có tìm kiếm và lọc đồ uống/món ăn. Topping chỉ áp dụng đồ uống. Không còn phần công thức, định lượng hay tồn kho. Khi sao lưu, giữ cả CSDL và `backend/uploads/menu` chứa ảnh tải lên.

## Tạo voucher và bán thử

1. Mở Voucher/CRM, tạo mã ví dụ `DEMO10`: giảm 10%, đơn tối thiểu 50.000đ, giảm tối đa 30.000đ, hạn dùng phù hợp, 100 lượt. Chủ chuỗi có thể chọn toàn chuỗi hoặc chi nhánh; quản lý tạo trong chi nhánh mình.
2. Trong tab ca POS, mở ca với 1.000.000đ.
3. Trong POS thêm 2 Bạc xỉu M, mỗi ly thêm sữa. Tạm tính = 88.000đ.
4. Nhập `DEMO10` hoặc chọn mã trong danh sách rồi bấm Áp dụng. Giảm 8.800đ, phải thu **79.200đ**. Voucher mẫu `CAFE10` cho cùng kết quả.
5. Nhập khách đưa 100.000đ, thanh toán CASH. Tiền trả lại 20.800đ. Không có giao dịch khác thì két lý thuyết **1.079.200đ**.
6. Hoàn tất đơn trên KDS rồi chốt ca với số thực đếm. Tải lại trang để xác nhận dữ liệu đã lưu trên SQL Server của máy.

Lượt voucher tăng lúc thu tiền thành công. Xem trước không tiêu lượt; không cộng dồn hai mã. Có thể dừng/kích hoạt voucher trong bảng quản lý. Nếu mã hết hạn/hết lượt hoặc không đủ điều kiện, giao diện báo lỗi và không giữ giảm giá cũ.

Trang [http://localhost:5000/order.html](http://localhost:5000/order.html) cho khách đặt món và áp dụng voucher trước khi gửi đơn. Đơn online chờ thu tiền tại POS; hộp thu tiền cho áp dụng/đổi/bỏ voucher và kiểm tra điều kiện lại. Chỉ khi thu thành công đơn mới vào KDS.

## Xử lý lỗi khởi động

| Hiện tượng                | Cách kiểm tra                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| ELOGIN                    | Đăng nhập SSMS bằng đúng tài khoản SQL trong `.env`, kiểm tra mật khẩu và chế độ SQL Authentication |
| Timeout hoặc ECONNREFUSED | Dịch vụ SQL đang chạy, TCP/IP bật, cổng/hostname đúng                                               |
| EINSTLOOKUP               | Tên named instance/SQL Server Browser; có thể dùng cổng TCP cố định                                 |
| Sai schema                | Dùng SQL 01 và 02 của cùng bản v4, `DB_DATABASE=CoffeeChainCafeV4`                                  |
| Web không vào được        | Terminal còn chạy, mở đúng cổng PORT; nếu cổng bị chiếm hãy đổi PORT rồi mở URL mới                 |
| Ảnh ngoài mạng không tải  | Chọn ảnh trên máy hoặc dùng ảnh mẫu cục bộ; URL phải truy cập công khai                             |

Không chép dữ liệu SQL v3 lên schema v4. Database cũ được giữ riêng; chuyển dữ liệu cũ cần ánh xạ theo schema mới.
