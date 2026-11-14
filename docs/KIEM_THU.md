# Kết quả kiểm thử KiotCafe

Như Ý phụ trách kiểm thử tự động, kiểm thử trên trình duyệt và kiểm thử tích hợp SQL Server. Người phụ trách từng phần cung cấp dữ liệu mẫu và sửa lỗi trong phần mã mình quản lý.

| Lệnh | Phạm vi |
| --- | --- |
| `npm run check` | Cú pháp JavaScript, import và tài nguyên giao diện. |
| `npm test` | Quy tắc nghiệp vụ, HTTP, ảnh, phân ca, topping và giao dịch với SQL giả lập. |
| `npm run db:check` | Kết nối SQL Server, schema và dữ liệu mẫu. |
| `npm run test:sql` | Kiểm tra schema, seed và giao dịch trên một database kiểm thử riêng. |

Trên trình duyệt, thử mở ca khi chi nhánh chưa có ca. Kiểm tra gợi ý tiền đầu ca từ ca trước và trường lý do khi nhập lệch. Sau khi mở ca, ghi một phiếu thu và một phiếu chi. Tạo đơn tại quầy, thu tiền đơn online, kiểm tra tiền mặt và chuyển khoản, rồi hoàn tất đơn ở màn hình KDS. Đối chiếu két lý thuyết với tiền thực đếm, ghi lý do nếu chênh lệch và xác nhận lịch sử chốt ca. Kiểm tra các luồng chi nhánh, phân quyền, nhân sự và menu trong cùng lượt bàn giao.

Khi phát hiện lỗi, ghi chức năng, dữ liệu thử, các bước, kết quả mong đợi, kết quả thực tế và người sửa. Như Ý thử lại sau khi nhận bản sửa.

SQL Server thật cần được xác nhận trên máy nhóm sau khi cấu hình `backend/.env`. Lệnh `npm run test:sql` cần quyền tạo database kiểm thử.
