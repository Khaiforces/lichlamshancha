// --- config.js: FILE DỮ LIỆU LÕI ---

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

// CẬP NHẬT: Danh sách các ca chuẩn cho phép nhân viên đăng ký và hệ thống xuất ra
const SHIFTS = [
    '07:00 - 12:00', '07:00 - 15:00', '07:00 - 17:00', 
    '10:00 - 15:00', '12:00 - 17:00', '12:00 - 23:00', 
    '15:00 - 23:00', '17:00 - 23:00'
];

// Khung giờ lõi Admin cần độ bao phủ (Quota)
const CORE_BLOCKS = [
    '07:00 - 12:00',
    '12:00 - 15:00',
    '15:00 - 17:00',
    '17:00 - 23:00'
];

const STAFF_LIST = [
    { id: 'nv1', name: 'Viết Khải', type: 'FT' }, 
    { id: 'nv2', name: 'Anh Thư', type: 'FT' },
    { id: 'nv3', name: 'Quốc Dũng', type: 'FT' }, 
    { id: 'nv4', name: 'Hoàng Bảo', type: 'FT' },
    { id: 'nv5', name: 'Bảo Lâm', type: 'FT' }, 
    { id: 'nv6', name: 'Thanh Toàn', type: 'PT' },
    { id: 'nv7', name: 'Minh Thư', type: 'PT' }, 
    { id: 'nv8', name: 'Phương Quỳnh', type: 'PT' },
    { id: 'nv9', name: 'Mỹ Uyên', type: 'PT' }, 
    { id: 'nv10', name: 'Bảo Huyền', type: 'PT' },
    { id: 'nv11', name: 'Bảo Ngân', type: 'PT' }, 
    { id: 'nv12', name: 'Cẩm Tú', type: 'PT' },
    { id: 'nv13', name: 'Bảo Duy', type: 'PT' }, 
    { id: 'nv14', name: 'Tuấn Dũng', type: 'PT' }
];

const DEFAULT_QUOTA = 2;
const DEFAULT_TAB_PASSWORD = 'iamgay';