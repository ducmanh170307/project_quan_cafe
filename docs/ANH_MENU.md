# Ảnh mẫu thực đơn

Tám ảnh JPG dưới đây được đóng gói tại `frontend/src/assets/menu/`, phục vụ cùng ứng dụng và không cần kết nối Internet khi trình diễn. Đây là ảnh minh họa; quản lý có thể thay bằng ảnh thực tế của quán qua form menu. `placeholder.svg` do dự án tạo, dùng khi ảnh trống hoặc không tải được.

| File           | Món minh họa   | Nguồn ảnh                                                                |
| -------------- | -------------- | ------------------------------------------------------------------------ |
| latte.jpg      | Bạc xỉu        | [Unsplash](https://images.unsplash.com/photo-1461023058943-07fcbe16d735) |
| coffee.jpg     | Cà phê đen     | [Unsplash](https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd) |
| tea.jpg        | Trà chanh      | [Unsplash](https://images.unsplash.com/photo-1556679343-c7306c1976bc)    |
| milk-tea.jpg   | Trà sữa ô long | [Unsplash](https://images.unsplash.com/photo-1558857563-b371033873b8)    |
| croissant.jpg  | Bánh sừng bò   | [Unsplash](https://images.unsplash.com/photo-1555507036-ab1f4038808a)    |
| cheesecake.jpg | Cheesecake     | [Unsplash](https://images.unsplash.com/photo-1533134242443-d4fd215305ad) |
| sandwich.jpg   | Sandwich trứng | [Unsplash](https://images.unsplash.com/photo-1528735602780-2552fd46c7af) |
| banh-mi.jpg    | Bánh mì kẹp    | [Unsplash](https://images.unsplash.com/photo-1509722747041-616f39b57569) |

Ảnh tải qua CDN Unsplash với chiều rộng 800 px, định dạng JPG. Khi thay ảnh bằng URL ngoài, URL cần là ảnh công khai HTTP(S); ảnh tải từ máy chấp nhận JPG, PNG, WebP tối đa 2 MB. Thư mục runtime `backend/uploads/menu` chỉ phát sinh khi tải ảnh lên và không cần chứa sẵn trong ZIP.
