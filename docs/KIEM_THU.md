# Kết quả kiểm thử phiên bản 4

Ngày kiểm tra: 04/11/2026. Node.js 24.22.1. Các kết quả bên dưới áp dụng bản mã trong gói này.

## Kiểm tra tự động

- `npm run check`: đạt kiểm tra cú pháp JavaScript, import ES6, HTML và tài nguyên cục bộ.
- `npm test`: **60/60 kiểm thử đạt**, chạy bằng Node test runner, không cần SQL Server.
- Kiểm tra Chromium với API fixture: **20 nhóm thao tác đạt**, 155 request, không có lỗi JavaScript; ảnh mẫu tải thành công. Có kiểm tra màn hình 390 px không tràn toàn trang.

| Nhóm       | Phần được kiểm tra                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Phân ca    | Ngày/giờ Việt Nam, ca qua đêm, giao ca liên tiếp, trùng giờ, giới hạn ngày/tuần, nhiều nhân viên và rollback toàn bộ             |
| Chỉnh lịch | Nhân viên sai chi nhánh/trạng thái, ca có chấm công, sửa/hủy, sao chép tuần, trạng thái xin nghỉ                                 |
| Menu/ảnh   | Giá thật từ server, đồ uống/món ăn PHAN, không cho topping món ăn, URL ảnh, MIME/chữ ký/kích thước, upload rồi đọc lại đúng byte |
| Voucher    | Đơn tối thiểu, cap giảm, ngày hiệu lực, phạm vi chi nhánh, giới hạn lượt, báo giá không tiêu lượt, thu tiền tiêu một lượt        |
| Giao dịch  | Transaction/rollback, chống đơn/thanh toán trùng, không đủ tiền, giá thay đổi, cạnh tranh lượt voucher cuối                      |
| Online/KDS | Chờ thu tiền, đổi voucher khi thu, hoàn tất/làm lại, chặn chốt ca còn đơn                                                        |
| Quyền/API  | Cookie phiên, quyền server, chặn giả ADMIN, chặn chéo chi nhánh, lỗi JSON/API, không phục vụ file cấu hình                       |
| Tiền mặt   | Két CASH, thẻ/chuyển khoản, hoàn tiền và đối soát ca                                                                             |

Kiểm tra trình duyệt thao tác trên giao diện thật với dữ liệu API giả lập: đăng nhập, chọn chi nhánh có 8 người, phân nhiều người theo giờ tùy chọn, sửa/hủy/sao chép ca, tạo món ăn với ảnh, tạo voucher, mở ca, giỏ hàng/topping, áp dụng mã và thanh toán, KDS, đặt online, hộp thu tiền online, đổi chi nhánh và giao diện nhân viên. Đây không phải kiểm thử toàn hệ thống với database thật.

## SQL Server thật cần xác nhận trên máy nhóm

Môi trường soạn mã chưa có SQL Server, nên **chưa chạy** `npm run db:check` và `npm run test:sql` với SQL Server thật. Các kiểm thử model dùng lớp SQL giả lập và không chứng minh cú pháp, driver hoặc mức khóa thực tế trên SQL Server.

Sau khi điền `backend/.env`, chạy:

```powershell
npm run db:check
npm run test:sql
```

`test:sql` cần quyền CREATE DATABASE. Script tự tạo database riêng tên `KiotCafe_Test_...`, chạy schema/seed hai lần, kiểm tra 8 người/chi nhánh, phân ca nhiều người/sửa/hủy, chấm công, ảnh menu/món ăn, báo giá voucher, thu tiền/chống trùng, đơn online/KDS và chốt ca. Cuối cùng script xóa chính database test vừa tạo, không dùng database làm việc hiện tại làm nơi thử nghiệm. Script tạo database test chỉ để chạy theo yêu cầu của bạn, không được tự chuyển sang xóa/chạy thử trên database có sẵn nếu thiếu quyền.

Thử thêm trực tiếp bằng SSMS/ứng dụng: so sánh lịch và bảng chấm công sau khi tải lại trang, xác nhận lượt voucher sau thu tiền, kiểm tra hóa đơn và két theo ví dụ trong `HUONG_DAN_VSCODE.md`.

## Giới hạn chức năng

Thẻ/chuyển khoản vẫn do thu ngân xác nhận, chưa tích hợp cổng thanh toán; chấm công theo ca chưa xác minh GPS; chưa tính lương chính thức hay phát hành hóa đơn điện tử. Ảnh tải lên là file cục bộ, cần sao lưu cùng dữ liệu. Bản này không có chức năng kho hoặc công thức BOM.
