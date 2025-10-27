

import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import * as api from '../api';
import type { Class, Assignment, Submission, Teacher } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Button } from '../components/shared/Button';
import { Spinner } from '../components/shared/Spinner';
import { MOCK_CLASSES, MOCK_ASSIGNMENTS, MOCK_SUBMISSIONS, MOCK_TEACHERS } from '../constants';

// Define the context type
interface DataContextType {
  classes: Class[];
  assignments: Assignment[];
  submissions: Submission[];
  teachers: Teacher[];
  loading: boolean;
  error: string | null; // For non-critical warnings displayed in the UI
  fetchData: () => Promise<void>;
  loadMockData: () => void;
}

// Create the context
export const DataContext = createContext<DataContextType | undefined>(undefined);

// Custom hook to use the data context
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};


// Component mới: Hiển thị lỗi toàn màn hình để hướng dẫn người dùng khắc phục sự cố kết nối.
const ApiConnectionError: React.FC<{ error: string; onRetry: () => void; isRetrying: boolean }> = ({ error, onRetry, isRetrying }) => (
  <div className="fixed inset-0 bg-slate-100 z-50 flex items-center justify-center p-4">
    <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-slate-800">Lỗi Kết Nối Máy Chủ</h2>
        </div>

        <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm" role="alert">
            <strong className="font-bold">Lỗi chi tiết:</strong>
            <span className="block sm:inline ml-1 whitespace-pre-line">{error}</span>
        </div>

        <div className="text-left mt-6 space-y-4 text-slate-700">
            <p className="font-bold text-slate-800">Làm thế nào để khắc phục:</p>
            <p>Lỗi này thường xảy ra do sự cố cấu hình giữa ứng dụng và backend (Google Apps Script). Vui lòng làm theo các bước sau:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm bg-slate-50 p-4 rounded-md">
                <li>Mở file <code>src/api.tsx</code> trong code của bạn.</li>
                <li>Tìm biến <code>API</code> ở đầu file.</li>
                <li>Đảm bảo URL trong biến này là URL <strong>Web App</strong> MỚI NHẤT từ dự án Google Apps Script của bạn.</li>
                <li>Trong Google Apps Script, khi triển khai (Deploy), mục "Who has access" <strong>PHẢI</strong> được đặt thành "Anyone".</li>
                <li>Mỗi khi bạn thay đổi code trong Google Apps Script, bạn <strong>PHẢI</strong> tạo một bản triển khai mới (Deploy &gt; New deployment) và cập nhật lại URL trong file <code>api.tsx</code>.</li>
            </ol>
            <p>Sau khi kiểm tra, hãy thử tải lại trang hoặc bấm nút bên dưới.</p>
        </div>
        
        <div className="mt-8 text-center">
            <Button onClick={onRetry} disabled={isRetrying} size="md">
                {isRetrying && <Spinner size="sm" />}
                <span>{isRetrying ? 'Đang thử lại...' : 'Thử lại kết nối'}</span>
            </Button>
        </div>
    </div>
  </div>
);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useLocalStorage<Class[]>('classes', []);
  const [assignments, setAssignments] = useLocalStorage<Assignment[]>('assignments', []);
  const [submissions, setSubmissions] = useLocalStorage<Submission[]>('submissions', []);
  const [teachers, setTeachers] = useLocalStorage<Teacher[]>('teachers', []);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState<{ type: 'critical' | 'warning', message: string } | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const loadMockData = () => {
    console.log("Loading mock data into context...");
    setClasses(MOCK_CLASSES);
    setAssignments(MOCK_ASSIGNMENTS);
    setSubmissions(MOCK_SUBMISSIONS);
    setTeachers(MOCK_TEACHERS);
    setErrorInfo({
        type: 'warning',
        message: "Đã tải dữ liệu mẫu vì không thể kết nối đến máy chủ. Một số tính năng có thể không hoạt động."
    });
    setLoading(false);
  };
  
  const fetchData = async () => {
    console.log("Fetching data from API...");
    if (errorInfo) setIsRetrying(true);
    setErrorInfo(null); // Clear previous errors on new fetch attempt
    setLoading(true);
  
    // Hàm bao bọc để xử lý lỗi "sheet rỗng" một cách linh hoạt
    const fetchDataSafely = async (apiCall: () => Promise<any>, callName: string) => {
      try {
        const result = await apiCall();
        return result.data || [];
      } catch (e: any) {
        // Nếu lỗi là do sheet rỗng, trả về một mảng rỗng thay vì làm hỏng toàn bộ ứng dụng
        if (e.message && e.message.includes('Số hàng trong dải ô phải tối thiểu là 1')) {
          console.warn(
            `API call '${callName}' failed because the Google Sheet is likely empty. Returning an empty array.`,
            e.message
          );
          return []; // Trả về mảng rỗng mặc định
        }
        // Ném lại các lỗi khác để chúng được xử lý như lỗi kết nối thông thường
        throw e;
      }
    };
  
    try {
      // Sử dụng Promise.all để tìm nạp tất cả dữ liệu song song
      const [classesData, assignmentsData, submissionsData, teachersData] = await Promise.all([
        fetchDataSafely(api.classesList, 'classesList'),
        fetchDataSafely(api.assignList, 'assignList'),
        fetchDataSafely(api.submitList, 'submitList'),
        fetchDataSafely(api.teachersList, 'teachersList'),
      ]);
  
      setClasses(classesData);
      setAssignments(assignmentsData);
      setSubmissions(submissionsData);
      setTeachers(teachersData);

      // Sau khi tải thành công, kiểm tra các sheet trống và đưa ra cảnh báo hữu ích
      const warnings = [];
      if (classesData.length === 0) {
        warnings.push("Trang tính 'Classes' trống. Bạn cần tạo ít nhất một lớp học để hệ thống hoạt động.");
      }
      if (teachersData.length === 0) {
        warnings.push("Trang tính 'Teachers' trống. Bạn cần tạo ít nhất một tài khoản giáo viên (ví dụ: admin) để có thể đăng nhập.");
      }
      
      if (warnings.length > 0) {
          setErrorInfo({
              type: 'warning',
              message: `Hệ thống đã kết nối thành công, nhưng có một vài lưu ý để thiết lập:\n- ${warnings.join('\n- ')}\n\nVui lòng kiểm tra và điền dữ liệu vào các trang tính tương ứng trong Google Sheet của bạn.`
          });
      }
  
    } catch (e: any) {
      console.error("Failed to fetch initial data:", e);
      // Đặt lỗi nghiêm trọng nếu không thể kết nối hoặc có lỗi cấu hình
      setErrorInfo({
          type: 'critical',
          message: e.message || 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.'
      });
      // Giữ lại dữ liệu cũ từ localStorage nếu có lỗi
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: DataContextType = {
    classes,
    assignments,
    submissions,
    teachers,
    loading,
    // Chỉ hiển thị các cảnh báo không nghiêm trọng trong giao diện người dùng chính
    error: errorInfo?.type === 'warning' ? errorInfo.message : null,
    fetchData,
    loadMockData,
  };

  // Chỉ hiển thị màn hình lỗi toàn trang cho các lỗi 'nghiêm trọng'
  if (errorInfo?.type === 'critical' && !isRetrying) {
    return <ApiConnectionError error={errorInfo.message} onRetry={fetchData} isRetrying={isRetrying} />;
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
