# Hệ thống xếp lịch

## Đồng bộ dữ liệu Firebase

Ứng dụng dùng Firebase Authentication ẩn danh và Cloud Firestore để mọi người có đường dẫn website đều xem, đăng ký và chỉnh sửa dữ liệu lịch chung. Không cần tạo tài khoản. Vì quyền ghi được mở cho mọi khách truy cập, bất kỳ ai có link cũng có thể thay đổi đăng ký, lịch, định mức và lịch sử.

Trước khi dùng:

1. Trong Firebase Console, mở **Authentication → Sign-in method** và bật **Anonymous**. Ở phần **Authorized domains**, thêm tên miền Netlify của website nếu tên miền đó chưa có trong danh sách.
2. Từ thư mục dự án, đăng nhập Firebase CLI rồi triển khai Firestore Rules:

   ```powershell
   firebase login
   firebase deploy --only firestore:rules --project lichlamshancha
   ```

3. Triển khai các file website lên Netlify qua HTTPS. Không mở `index.html` trực tiếp bằng `file://`; Firebase cần một origin web để đăng nhập và đồng bộ.

`firebase.json` trỏ đến `firestore.rules`. Dữ liệu được lưu ở tài liệu `shared/schedule` và cập nhật trực tiếp giữa các trình duyệt. Nếu không cấu hình Anonymous Authentication hoặc chưa triển khai Rules, trang sẽ báo trạng thái không kết nối được.

Ứng dụng không ghi nhật ký truy cập hoặc nhật ký chỉnh sửa riêng. Firebase vẫn có thể duy trì các log vận hành/dịch vụ theo chính sách của Google Cloud.

Các khóa Firebase trong `config.js` là cấu hình web công khai, không phải thông tin đăng nhập quản trị. Không thêm service-account key hoặc private key vào website.

Định mức ca lõi chia khung buổi sáng thành `07:00 - 10:00` và `10:00 - 12:00`; thuật toán xếp lịch và cảnh báo đều dùng các khung này. Định mức cũ `07:00 - 12:00` được chuyển sang cả hai khung mới khi dữ liệu được đọc, trừ khi khung mới đã có định mức riêng.

Đăng ký ca `07:00 - 17:00` biểu thị thời gian sẵn sàng trong toàn khoảng; thuật toán có thể xếp các ca đầu ra nằm trọn bên trong, chẳng hạn `07:00 - 12:00`, `07:00 - 15:00`, `10:00 - 15:00` hoặc `12:00 - 17:00`.
