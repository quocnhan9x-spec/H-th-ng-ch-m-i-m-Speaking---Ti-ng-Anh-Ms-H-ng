

import React, { useEffect, useState, useContext } from 'react';

// ĐÚNG đường dẫn + named/default export
import { Login } from './components/Login';
import { RoleSelection } from './components/RoleSelection';
import { TeacherView } from './components/TeacherView';
// FIX: Changed to a default import for StudentView as it's exported as default.
import StudentView from './components/StudentView';
import { Header } from './components/shared/Header';
import { Spinner } from './components/shared/Spinner';
import { DataContext } from './contexts/DataContext';
import { MOCK_TEACHERS } from './constants'; // Import mock data

// Dùng Apps Script Web App để đăng nhập
import { login as apiLogin } from './api';

// ===== Kiểu dữ liệu cơ bản =====
type User = {
  id: string;
  username: string;
  role?: 'admin' | 'teacher' | 'student';
  name?: string;
};

type AppState = 'initializing' | 'login' | 'role' | 'teacher' | 'student';

const MainContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const dataContext = useContext(DataContext);
    const loading = dataContext?.loading;
    const error = dataContext?.error;

    return (
        <main className="container mx-auto px-4 sm:px-6 md:px-8 py-8">
            {loading && (
                <div className="flex flex-col justify-center items-center h-64">
                    <Spinner size="lg" />
                    <p className="mt-4 text-slate-500">Đang tải dữ liệu...</p>
                </div>
            )}
            {error && !loading && (
                <div className="p-4 my-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 whitespace-pre-line">
                    <p className="font-bold">Thông báo</p>
                    <p>{error}</p>
                </div>
            )}
            {!loading && children}
        </main>
    );
};

const AppLayout: React.FC<{ children: React.ReactNode, user: User | null, onLogout: () => void, onBack: () => void }> = ({ children, user, onLogout, onBack }) => {
    return (
        <>
            <Header isLoggedIn={!!user} username={user?.name || user?.username} onLogout={onLogout} onBack={onBack} />
            <MainContent>{children}</MainContent>
        </>
    );
};


// ===== Ứng dụng chính =====
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>('initializing'); // Bắt đầu ở trạng thái khởi tạo
  const dataContext = useContext(DataContext);

  // Khôi phục user từ localStorage nếu có
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) {
        setAppState('role'); // Nếu không có user, hiển thị màn hình chọn vai trò công khai
        return;
      }
      const u = JSON.parse(raw);
      const user: User = {
        id: u.username || u.id || '',
        username: u.username || '',
        role: u.role,
        name: u.name || u.displayName,
      };
      setCurrentUser(user);
      if (user.role === 'admin' || user.role === 'teacher') {
        setAppState('teacher');
      } else if (user.role === 'student') {
        setAppState('student');
      } else {
        setAppState('role'); // Nếu user đã đăng nhập nhưng chưa có vai trò
      }
    } catch {
      setAppState('role'); // Lỗi -> về màn hình chọn vai trò
    }
  }, []);

  // Đăng nhập bằng API Apps Script
  const handleLogin = async (username: string, password: string) => {
    try {
      const res: any = await apiLogin(username, password);

      const user: User = {
        id: res.user.username || username,
        username: res.user.username || username,
        role: res.user.role,
        name: res.user.name || res.user.displayName,
      };
      localStorage.setItem('user', JSON.stringify(res.user));
      setCurrentUser(user);
      
      // Tải lại dữ liệu sau khi đăng nhập thành công
      await dataContext?.fetchData();

      if (user.role === 'admin' || user.role === 'teacher') setAppState('teacher');
      else if (user.role === 'student') setAppState('student');
      else setAppState('role'); // Sau khi đăng nhập, nếu user không có vai trò -> chọn vai trò
    } catch (e: any) {
      // Bỏ qua việc ném lại lỗi API để luôn thử đăng nhập bằng mock data.
      // Điều này cho phép ứng dụng hoạt động ngay cả khi backend gặp sự cố.
      console.warn('API login failed, attempting mock login fallback. Error:', e);

      // Dự phòng: Xác thực với dữ liệu mẫu
      const mockTeacher = MOCK_TEACHERS.find(
        (t) => t.username === username && t.password === password
      );

      if (mockTeacher) {
        console.log("Mock login successful.");
        const user: User = {
          id: mockTeacher.id,
          username: mockTeacher.username,
          role: 'teacher', // Giả định giáo viên mẫu luôn có vai trò 'teacher'
          name: mockTeacher.username,
        };
        
        const localStorageUser = {
            username: user.username,
            role: user.role,
            name: user.name,
            displayName: user.name,
        };
        
        localStorage.setItem('user', JSON.stringify(localStorageUser));
        setCurrentUser(user);
        
        // Populate the app with mock data when mock login is used
        dataContext?.loadMockData();
        
        setAppState('teacher');
      } else {
        // Nếu đăng nhập bằng mock data cũng thất bại, ném lỗi ban đầu để người dùng thấy.
        console.error('Mock login failed.');
        throw e;
      }
    }
  };

  // Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
    setAppState('role'); // Quay về trang chọn vai trò
  };

  const handleBackToRole = () => {
    // Luôn quay về màn hình chọn vai trò chính
    setAppState('role');
  };
  
  // ===== Render =====
  if (appState === 'initializing') {
    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-pink-50">
            <Spinner size="lg" />
            <p className="mt-4 text-slate-500">Đang khởi tạo ứng dụng...</p>
        </div>
    );
  }

  switch (appState) {
    case 'login':
      return <Login onLogin={handleLogin} onBack={() => setAppState('role')} />;
    case 'teacher':
      if (currentUser) return <AppLayout user={currentUser} onLogout={handleLogout} onBack={handleBackToRole}><TeacherView /></AppLayout>;
      return <Login onLogin={handleLogin} onBack={() => setAppState('role')} />; // Nếu không có user, yêu cầu đăng nhập
    case 'student':
      // Chế độ xem của học sinh không yêu cầu đăng nhập trong luồng này
      return <AppLayout user={currentUser} onLogout={handleLogout} onBack={handleBackToRole}><StudentView /></AppLayout>;
    case 'role':
    default:
      return <RoleSelection onPick={(role) => setAppState(role)} onLogout={currentUser ? handleLogout : undefined} />;
  }
}
