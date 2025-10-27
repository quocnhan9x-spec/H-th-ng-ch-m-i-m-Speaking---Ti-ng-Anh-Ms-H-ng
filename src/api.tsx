// api.tsx — kết nối Apps Script Web App
// ==========================================================================================
// !!! HƯỚNG DẪN QUAN TRỌNG ĐỂ SỬA LỖI "FAILED TO FETCH" / CORS !!!
// ==========================================================================================
// Lỗi "Failed to fetch" hoặc lỗi CORS xảy ra khi frontend (ứng dụng này) không thể
// kết nối đến backend (Google Apps Script). Điều này 99% là do cấu hình sai.
//
// ĐỂ SỬA LỖI, BẠN PHẢI LÀM THEO CÁC BƯỚC SAU MỘT CÁCH CẨN THẬN:
//
// 1. Mở dự án Google Apps Script của bạn.
//
// 2. Dán mã từ file `code.gs` mà tôi đã cung cấp vào trình soạn thảo.
//
// 3. TÌM VÀ ĐIỀN `DRIVE_FOLDER_ID` CỦA BẠN VÀO ĐẦU FILE `code.gs`.
//    Đây là ID của thư mục trên Google Drive mà bạn muốn dùng để lưu các file bài nộp.
//
// 4. Nhấp vào nút "Deploy" (Triển khai) ở góc trên bên phải, sau đó chọn "New deployment..."
//    (Bản triển khai mới).
//
// 5. Trong cửa sổ mới hiện ra:
//    - Ở mục "Select type" (biểu tượng bánh răng), chọn "Web app".
//    - Ở mục "Who has access", BẮT BUỘC chọn "Anyone". ĐÂY LÀ BƯỚC QUAN TRỌNG NHẤT.
//
// 6. Nhấp "Deploy". Bạn sẽ nhận được một URL Web App MỚI.
//
// 7. SAO CHÉP URL MỚI ĐÓ VÀ THAY THẾ HOÀN TOÀN URL TRONG DẤU NHÁY ĐƠN BÊN DƯỚI.
//
// LƯU Ý: MỖI KHI BẠN THAY ĐỔI BẤT CỨ ĐIỀU GÌ TRONG FILE `code.gs`, BẠN PHẢI
// LẶP LẠI CÁC BƯỚC TỪ 4 ĐẾN 7 ĐỂ CẬP NHẬT THAY ĐỔI.
// ==========================================================================================
const API = 'https://script.google.com/macros/s/AKfycbwL3lKnwSMmLSD3P15u6PgvC_bzMmSc8rcm8aRWMIJ-7zEPG8XwmXu0zbPP8VUeDHeJ/exec'; // <<== URL ĐÃ ĐƯỢC CẬP NHẬT! KIỂM TRA LẠI NẾU BẠN TRIỂN KHAI LẠI!

export async function api<T = any>(action: string, data: any = {}): Promise<T> {
  const requestBody = { action, data };

  // Thêm log để gỡ lỗi: Hiển thị chính xác những gì đang được gửi đi
  console.log(`%c[API Request] -> ${action}`, 'color: blue; font-weight: bold;', requestBody);

  try {
    const r = await fetch(API, {
      method: 'POST',
      mode: 'cors', // Explicitly set mode for clarity and to ensure CORS handling
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Use text/plain for Apps Script Web App POST requests
      body: JSON.stringify(requestBody),
      redirect: 'follow', // Important for Apps Script
      cache: 'no-cache', // Thêm tùy chọn này để ngăn chặn việc lưu cache các phản hồi cũ
    });

    if (!r.ok) {
      const errorText = await r.text().catch(() => 'Không thể đọc phản hồi lỗi.');
      throw new Error(`Lỗi HTTP ${r.status}: ${r.statusText}. ${errorText}`);
    }

    const contentType = r.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await r.text();
      console.error("Phản hồi không phải JSON. Có thể API đã chuyển hướng hoặc bị lỗi. Phản hồi nhận được:", responseText);
      
      throw new Error('Lỗi: Máy chủ đã trả về dữ liệu không hợp lệ (không phải JSON). Vui lòng kiểm tra lại URL Apps Script và cài đặt triển khai của bạn.');
    }

    const jsonResponse = await r.json();

    console.log(`%c[API Response] <- ${action}`, 'color: green; font-weight: bold;', jsonResponse);
    
    if (jsonResponse.ok === false) {
        throw new Error(`Lỗi từ API: ${jsonResponse.error || 'Lỗi không xác định từ máy chủ.'}`);
    }

    // Specific check for the default GET response from a misconfigured Apps Script.
    if (jsonResponse && jsonResponse.status && jsonResponse.status.startsWith('API is ready')) {
      throw new Error(
        'Lỗi Cấu hình Máy chủ (Apps Script): ' +
        'API đã trả về phản hồi mặc định thay vì dữ liệu được yêu cầu. ' +
        'Điều này thường có nghĩa là yêu cầu POST của ứng dụng đã không được xử lý đúng cách. ' +
        'Vui lòng kiểm tra các mục sau trong dự án Google Apps Script của bạn:\n\n' +
        '1. **Triển khai (Deployment):** Đảm bảo bạn đang sử dụng bản triển khai "Web app" MỚI NHẤT. Sau mỗi lần thay đổi code, bạn phải tạo một bản triển khai mới (Deploy > New deployment).\n\n' +
        '2. **Quyền truy cập:** Trong cài đặt triển khai, "Who has access" PHẢI được đặt thành "Anyone".\n\n' +
        '3. **Hàm doPost:** Dự án của bạn phải có một hàm tên là `doPost(e)` để xử lý các yêu cầu. Phản hồi bạn đang thấy có thể là từ `doGet(e)`.'
      );
    }
    
    return jsonResponse as T;

  } catch (err: any) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error(
        'Không thể kết nối đến máy chủ. Điều này có thể do lỗi mạng hoặc sự cố CORS. ' +
        'Vui lòng làm theo hướng dẫn ở đầu file `api.tsx` để kiểm tra lại cấu hình Google Apps Script của bạn.'
      );
    }
    throw err;
  }
}

// Auth
export const login = (username: string, password: string) =>
  api('login', { username, password });

// Teachers
export const teachersList   = () => api('teachers.list');
export const teacherUpsert  = (p: any) => api('teachers.upsert', p);
export const teacherDelete  = (p: { username: string }) => api('teachers.delete', p);

// Classes
export const classesList = () => api('classes.list');
export const classCreate = (p: any) => api('classes.create', p);
export const classUpdate = (p: any) => api('classes.update', p);
export const classDelete = (p: { id: string }) => api('classes.delete', p);

// Students (Not used in the current UI, but kept for future use)
export const studentsList  = (p?: { classId?: string }) => api('students.list', p || {});
export const studentCreate = (p: any) => api('students.create', p);
export const studentUpdate = (p: any) => api('students.update', p);
export const studentDelete = (p: { id: string }) => api('students.delete', p);

// Assignments
export const assignList   = (p?: { classId?: string }) => api('assign.list', p || {});
export const assignCreate = (p: any) => api('assign.create', p);
export const assignUpdate = (p: any) => api('assign.update', p);
export const assignDelete = (p: { id: string }) => api('assign.delete', p);

// Submissions & scoring
export const submitList    = (p?: { assignId?: string }) => api('submit.list', p || {});
export const submitCreate  = (p: any) => api('submit.create', p);
export const scoreUpdate   = (p: { submissionId: string; score?: number; feedback?: string; status?: 'pending' | 'graded', contentMismatched?: boolean }) => api('score.update', p);
export const submitDelete  = (p: { id: string }) => api('submit.delete', p);
