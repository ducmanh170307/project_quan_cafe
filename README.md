DuAnCNPM-QuanLyChuoiCafe 
Ứng dụng quản lý chuỗi cafe dùng Node.js/Express, SQL Server và JavaScript ES6 Modules. Bản này có 7 bộ Model/Controller/Route, 4 module giao diện, 20 bảng và 1 view KDS. Đã loại bỏ chức năng kho, nguyên liệu, công thức BOM và trừ tồn khỏi giao diện, API, nghiệp vụ bán hàng và schema mới.
Các chức năng chính
- Nhân sự và phân ca: mỗi chi nhánh mẫu có 8 nhân viên; chọn một hoặc nhiều người, ngày, vị trí và giờ cụ thể. Lịch tuần hỗ trợ sửa/hủy ca, sao chép tuần, xin/duyệt nghỉ và chấm công theo ca.
- Thực đơn có ảnh: đồ uống S/M/L và món ăn theo phần; ảnh JPG/PNG/WebP tải từ máy hoặc URL HTTP(S). Có sẵn 8 ảnh mẫu để chạy tại máy không cần tải ảnh từ mạng.
- Voucher: tạo mã giảm phần trăm hoặc số tiền, ngày hiệu lực, đơn tối thiểu, mức giảm tối đa, phạm vi chi nhánh và giới hạn lượt dùng. Áp dụng ở POS, đặt món online và khi thu tiền đơn online.
- Bán hàng: mở/chốt ca POS, thu chi nội bộ, giỏ hàng/topping, thu tiền, hóa đơn, hoàn tiền, KDS, khách hàng/tích điểm và báo cáo.
Phân công nhóm và nhánh GitHub
Thành viên	Nhánh làm việc	Bộ MVC	Phần quản lý
Mạnh	manh	branch, hr	Chi nhánh, tài khoản, phân quyền, phân ca, chấm công, cài SQL Server và tích hợp ứng dụng
Ý	nhwy	shift, promo	Ca POS, phiếu thu/chi, đối soát két, voucher và CRM
Trúc	truc	order, kds	Giỏ hàng, báo giá, đơn online, thanh toán, hoàn tiền, hóa đơn và pha chế
Linh	linh	product	Thực đơn, size, topping, ảnh và hộp chọn đường/đá


main là nhánh tích hợp của nhóm. Mạnh điều phối thay đổi ở frontend/index.html và các file SQL. Khi sửa báo giá hoặc thanh toán, Trúc phối hợp với Ý về voucher và đối soát, với Linh về giá món và topping.
Cấu trúc thư mục
Cây dưới đây theo bản QuanLyChuoiCafe-CaiDatSQL.zip. Chú thích sau mỗi tên file ghi người phụ trách chính và chức năng của file.
QuanLyChuoiCafe/
├── .gitignore                         # Mạnh · Quy tắc bỏ qua file cục bộ
├── package-lock.json                  # Mạnh · Khóa phiên bản dependencies
├── package.json                       # Mạnh · Lệnh chạy toàn dự án
├── README.md                          # Mạnh · Hướng dẫn và phân công
├── backend/
│   ├── .env.example                   # Mạnh · Mẫu cấu hình SQL Server
│   ├── package-lock.json              # Mạnh · Khóa phiên bản khi cài riêng backend
│   ├── package.json                   # Mạnh · Dependencies và lệnh của backend
│   ├── scripts/
│   │   ├── check.js                   # Mạnh · Kiểm tra JS và tài nguyên
│   │   ├── db-check.js                # Mạnh · Kiểm tra kết nối, bảng và view
│   │   ├── db-setup.js                # Mạnh · Khởi tạo database bằng terminal
│   │   └── sql-smoke.js               # Mạnh · Kiểm thử trên SQL Server
│   ├── src/
│   │   ├── app.js                     # Mạnh · Nối Express, API và giao diện
│   │   ├── server.js                  # Mạnh · Khởi động web server
│   │   ├── config/
│   │   │   └── db.js                  # Mạnh · Kết nối và giao dịch SQL Server
│   │   ├── controllers/
│   │   │   ├── branchController.js    # Mạnh · Xử lý yêu cầu chi nhánh
│   │   │   ├── hrController.js        # Mạnh · Xử lý yêu cầu nhân sự và chấm công
│   │   │   ├── kdsController.js       # Trúc · Xử lý yêu cầu màn hình pha chế
│   │   │   ├── orderController.js     # Trúc · Xử lý yêu cầu đơn và thanh toán
│   │   │   ├── productController.js   # Linh · Xử lý yêu cầu thực đơn và topping
│   │   │   ├── promoController.js     # Ý · Xử lý yêu cầu voucher và CRM
│   │   │   └── shiftController.js     # Ý · Xử lý yêu cầu ca POS và thu chi
│   │   ├── lib/
│   │   │   ├── access.js              # Mạnh · Kiểm tra quyền và phạm vi chi nhánh
│   │   │   ├── business.js            # Trúc · Giỏ hàng, giá, voucher và tính tiền
│   │   │   ├── errors.js              # Mạnh · Xử lý lỗi dùng chung
│   │   │   ├── locks.js               # Trúc · Khóa chi nhánh hoặc ca POS khi ghi
│   │   │   ├── menuImage.js           # Linh · Kiểm tra và lưu ảnh món
│   │   │   ├── schedule.js            # Mạnh · Giờ, ngày và ràng buộc phân ca
│   │   │   ├── security.js            # Mạnh · Băm PIN và token phiên
│   │   │   └── validation.js          # Mạnh · Kiểm tra dữ liệu đầu vào
│   │   ├── middleware/
│   │   │   └── auth.js                # Mạnh · Đăng nhập, phiên và phân quyền
│   │   ├── models/
│   │   │   ├── branchModel.js         # Mạnh · Dữ liệu và nghiệp vụ chi nhánh
│   │   │   ├── hrModel.js             # Mạnh · Dữ liệu và nghiệp vụ nhân sự và chấm công
│   │   │   ├── kdsModel.js            # Trúc · Dữ liệu và nghiệp vụ màn hình pha chế
│   │   │   ├── orderModel.js          # Trúc · Dữ liệu và nghiệp vụ đơn và thanh toán
│   │   │   ├── productModel.js        # Linh · Dữ liệu và nghiệp vụ thực đơn và topping
│   │   │   ├── promoModel.js          # Ý · Dữ liệu và nghiệp vụ voucher và CRM
│   │   │   └── shiftModel.js          # Ý · Dữ liệu và nghiệp vụ ca POS và thu chi
│   │   └── routes/
│   │       ├── branchRoutes.js        # Mạnh · Tuyến API chi nhánh
│   │       ├── hrRoutes.js            # Mạnh · Tuyến API nhân sự và chấm công
│   │       ├── kdsRoutes.js           # Trúc · Tuyến API màn hình pha chế
│   │       ├── orderRoutes.js         # Trúc · Tuyến API đơn và thanh toán
│   │       ├── productRoutes.js       # Linh · Tuyến API thực đơn và topping
│   │       ├── promoRoutes.js         # Ý · Tuyến API voucher và CRM
│   │       └── shiftRoutes.js         # Ý · Tuyến API ca POS và thu chi
│   └── test/
│       ├── business.test.js           # Ý · Kiểm thử nghiệp vụ dùng chung
│       ├── feedback.test.js           # Ý · Kiểm thử tùy chọn món, voucher và ca
│       ├── http.test.js               # Mạnh · Kiểm thử API và phân quyền
│       ├── images.test.js             # Linh · Kiểm thử ảnh món
│       ├── schedule.test.js           # Mạnh · Kiểm thử phân ca
│       ├── toppings.test.js           # Linh · Kiểm thử topping và giá
│       ├── transactions.test.js       # Trúc · Kiểm thử giao dịch đơn hàng
│       └── helpers/
│           └── memory-db.js           # Trúc · SQL giả lập cho kiểm thử
├── database-sql/
│   ├── 00_khoi_tao_kiotcafe.sql       # Mạnh · Tạo và nạp database demo
│   ├── 01_create_database.sql         # Mạnh · Cấu trúc 20 bảng và view KDS
│   └── 02_insert_data.sql             # Mạnh · Dữ liệu mẫu
├── docs/
│   ├── ANH_MENU.md                    # Linh · Nguồn ảnh menu
│   ├── HUONG_DAN_VSCODE.md            # Mạnh · Hướng dẫn chạy trong VS Code
│   ├── KICH_BAN_THUYET_TRINH.md       # Trúc · Kịch bản trình diễn
│   └── KIEM_THU.md                    # Ý · Tổng hợp kiểm thử
└── frontend/
    ├── index.html                     # Mạnh · Khung quản trị và POS
    ├── order.html                     # Trúc · Khung trang đặt món online
    └── src/
        ├── customer.js                # Trúc · Giỏ và thao tác đặt món của khách
        ├── main.js                    # Mạnh · Khởi tạo giao diện quản trị
        ├── assets/
        │   ├── style.css              # Linh · CSS dùng chung
        │   └── menu/
        │       ├── banh-mi.jpg        # Linh · Ảnh món mẫu
        │       ├── cheesecake.jpg     # Linh · Ảnh món mẫu
        │       ├── coffee.jpg         # Linh · Ảnh món mẫu
        │       ├── croissant.jpg      # Linh · Ảnh món mẫu
        │       ├── latte.jpg          # Linh · Ảnh món mẫu
        │       ├── milk-tea.jpg       # Linh · Ảnh món mẫu
        │       ├── placeholder.svg    # Linh · Ảnh thay thế
        │       ├── sandwich.jpg       # Linh · Ảnh món mẫu
        │       └── tea.jpg            # Linh · Ảnh món mẫu
        ├── modules/
        │   ├── linhMenu.js            # Linh · Quản lý thực đơn
        │   ├── manhBranchHr.js        # Mạnh · Chi nhánh, nhân sự và lịch ca
        │   ├── trucPosKds.js          # Trúc · Bán hàng, đơn và màn hình pha chế
        │   └── yShiftCashflow.js      # Ý · Ca POS, thu chi, voucher và CRM
        └── services/
            ├── api.js                 # Mạnh · Gọi API và hàm giao diện chung
            ├── billing.js             # Trúc · Báo giá cho POS và đơn online
            └── optionPicker.js        # Linh · Chọn đường, đá và topping
Bổ sung theo góp ý của thầy
- POS có thanh danh mục và hộp chọn đồ uống: chọn nhiều topping kèm số lượng (có nút chọn tất cả), mức đường và mức đá, ghi chú. Dòng "Đã chọn" hiện ngay bên dưới; giỏ hàng, hóa đơn và KDS đều hiển thị đường/đá/topping. Trang khách đặt món dùng chung hộp chọn này.
- Voucher: thêm đối tượng áp dụng (mọi khách / chỉ khách thành viên). Có nút Xóa voucher (chỉ xóa được voucher chưa dùng trong đơn nào; đã dùng thì chỉ Tắt). Bảng quản lý có tình trạng Đang chạy / Sắp diễn ra / Đã tắt / Hết hạn / Hết lượt và bộ lọc theo bật-tắt, thời gian, đối tượng. POS chỉ liệt kê voucher dùng được và mô tả điều kiện.
- Mở ca / chốt ca hiển thị theo trạng thái: chưa có ca thì chỉ hiện bước Mở ca; có ca thì ẩn form mở ca. Tiền đầu ca gợi ý bằng tiền chốt ca trước, lệch phải ghi lý do.
- Nhân sự tách thành ba phần: Lịch phân ca (xếp theo từ ngày – đến ngày và chọn các thứ trong tuần, tối đa 31 ngày mỗi lần), Chấm công (có "Ca làm của tôi hôm nay"), Tài khoản nhân viên. Đăng xuất khi chưa check-out sẽ có cảnh báo.
- Kịch bản chạy demo từng bước: docs/KICH_BAN_THUYET_TRINH.md.
Nâng cấp từ database v4 đã có: chạy lại 01_create_database.sql (tự thêm cột DoiTuongApDung) rồi 02_insert_data.sql.
Cài đặt trong VS Code
Cần Node.js từ 22 trở lên và SQL Server 2017 trở lên. Giải nén toàn bộ ZIP, mở thư mục có package.json trong VS Code. Sao chép backend/.env từ bản đang dùng hoặc tạo từ backend/.env.example, rồi xác nhận đúng DB_SERVER, DB_USER và DB_PASSWORD.

Mở PowerShell tại thư mục gốc và chạy từng lệnh:
npm ci
npm run db:setup
npm run db:check
npm start
db:setup tạo database demo CoffeeChainCafeV4_KiotCafe, nạp dữ liệu mẫu và cập nhật DB_DATABASE khi đã xác nhận 20 bảng và 1 view. Lệnh chạy qua kết nối SQL Server của backend. Khi báo lỗi kết nối, kiểm tra SQL Server đã bật TCP/IP và DB_PORT hoặc tên instance trong .env. Khi báo lỗi SQL, lệnh hiển thị batch, vị trí trong file và mã lỗi.

Mở http://localhost:5000. Chủ chuỗi: 0900000000 / 999999. Trang khách đặt món: http://localhost:5000/order.html.

Backend phục vụ cả API và giao diện. Xem docs/HUONG_DAN_VSCODE.md để có đầy đủ tài khoản và kịch bản sử dụng.
Phân ca
Dữ liệu mẫu có 2 chi nhánh, mỗi chi nhánh 8 người: 1 quản lý, 2 thu ngân, 3 pha chế, 2 phục vụ. Chủ chuỗi là tài khoản toàn chuỗi riêng. 8 là số người mẫu, không phải giới hạn cứng; có thể thêm nhân viên.

Trong tab Nhân sự, chọn tuần/ngày và các nhân viên, chọn vị trí Thu ngân/Pha chế/Phục vụ/Quản lý ca/Bếp, nhập giờ bắt đầu/kết thúc rồi lưu. Ví dụ người A làm Thu ngân 06:00–12:00, người B làm Pha chế 06:00–12:00, người C làm Phục vụ 12:00–18:00. Một người được có nhiều ca không chồng giờ. Ca qua đêm phải bật tùy chọn kết thúc hôm sau.

Server chặn người khác chi nhánh, tài khoản ngừng hoạt động, trùng lịch, ca quá dài và vượt số giờ. Mặc định tối đa 12 giờ/ca, 12 giờ/ngày, 48 giờ/tuần; điều chỉnh qua ba biến SCHEDULE_MAX_* trong .env. Ca tiếp nối như 06:00–12:00 và 12:00–16:00 được chấp nhận. Lịch xin nghỉ vẫn giữ chỗ đến khi quản lý duyệt; lịch đã chấm công không được sửa/hủy. Giờ nhập/hiển thị là giờ Việt Nam, dữ liệu thời điểm lưu UTC.
Menu và voucher khi thanh toán
Chủ chuỗi quản lý menu: chọn loại Đồ uống hoặc Món ăn, danh mục, size/giá, ảnh rồi lưu. Món ăn dùng PHAN; đồ uống dùng S/M/L và có thể thêm topping. Ảnh tải lên tối đa 2 MB, được lưu tại backend/uploads/menu; cần giữ thư mục này khi sao lưu dữ liệu ứng dụng. Ảnh mẫu và nguồn ảnh nằm trong docs/ANH_MENU.md.

Trong tab Voucher/CRM, chủ chuỗi hoặc quản lý tạo mã. Tại POS, chọn/nhập mã và bấm Áp dụng. Hóa đơn hiển thị tạm tính → giảm giá → phải thu trước khi thu tiền. Server tự tính lại theo giá/điều kiện thật; nếu giá hoặc voucher thay đổi trong lúc thanh toán, yêu cầu báo giá lại.

Ví dụ: 2 Bạc xỉu M 39.000đ, mỗi ly thêm sữa 5.000đ = 88.000đ. Mã CAFE10 giảm 10% = 8.800đ; phải thu 79.200đ, khách đưa 100.000đ thì trả 20.800đ. Với ca mở 1.000.000đ và không có giao dịch khác, két lý thuyết là 1.079.200đ.

Mỗi đơn áp dụng tối đa một mã. Xem trước và tạo đơn online chưa thu tiền không tiêu lượt voucher; thu tiền thành công mới tăng một lượt trong cùng transaction. Gửi lại thanh toán không tăng lượt lần nữa. Voucher của đơn online được kiểm tra lại lúc thu tiền; thu ngân có thể đổi/bỏ mã. Hoàn tiền không trả lại lượt đã sử dụng theo quy tắc của bản này.
Luồng tiền và KDS
Mở ca → tạo đơn/thu tiền → KDS pha chế/chế biến → hoàn tất → chốt ca. Đơn online chưa thu tiền chờ tại POS, sau khi thu mới vào KDS. KDS hỗ trợ ghi nhận số lượng hoàn tất/làm lại và không còn bước xử lý kho.

Két lý thuyết = tiền đầu ca + thu CASH − hoàn CASH + thu nội bộ − chi nội bộ. Giao dịch thẻ/chuyển khoản không cộng vào két. Hoàn đơn đã trả cần quyền quản lý và ca gốc còn mở.
Database và kiểm thử
Schema/seed đều là phiên bản 4. Hai script có thể chạy lại cùng phiên bản mà không nhân đôi dữ liệu mẫu hoặc đặt lại PIN. Script từ chối schema khác phiên bản. Dùng trọn bộ code và SQL v4; database CoffeeChainCafeV4 tách khỏi bản dự án cũ, không tự di chuyển dữ liệu cũ. Các bảng kho của database cũ không được sử dụng; schema mới không tạo chúng.

npm run db:check kiểm tra 20 bảng, view KDS, cột đối tượng voucher và phiên bản của cả hai script. Nếu thiếu cấu trúc, chạy lại file 01 rồi chạy file 02. SQL mẫu được thiết kế cho SQL Server và có lệnh GO để phân tách batch trong SSMS.
npm run check
npm test
npm run test:sql
check kiểm tra cú pháp/import/tài nguyên. npm test: 70 kiểm thử tự động đã đạt, dùng tầng SQL giả lập. test:sql tạo database test riêng để nhóm xác nhận schema/seed và giao dịch trên SQL Server. Xem docs/KIEM_THU.md.

Thanh toán thẻ/chuyển khoản hiện do thu ngân xác nhận thủ công; chưa tích hợp cổng thanh toán, hóa đơn điện tử hay tính lương chính thức. Chấm công theo ca không xác minh vị trí GPS thực tế.
