import React, { ReactNode } from 'react';
import { logoDataUrl } from '../assets/logo';

type Role = 'student' | 'teacher';

interface RoleSelectProps {
  onPick: (role: Role) => void;
  onLogout?: () => void;
}

interface RoleCardProps {
  onClick: () => void;
  title: string;
  description: string;
  icon: ReactNode;
}

const RoleCard: React.FC<RoleCardProps> = ({ onClick, title, description, icon }) => (
  <button
    onClick={onClick}
    className="w-full max-w-sm p-8 text-center bg-white/60 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg hover:border-pink-300 hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-pink-200"
  >
    <div className="mx-auto mb-6 flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-br from-pink-100 to-rose-200 text-pink-600 shadow-inner">
      {icon}
    </div>
    <h3 className="text-2xl font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-500 leading-relaxed">{description}</p>
  </button>
);

export const RoleSelection: React.FC<RoleSelectProps> = ({ onPick, onLogout }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative bg-gradient-to-br from-purple-50 via-pink-50 to-rose-100">
      
      {onLogout && (
        <button
          onClick={onLogout}
          className="absolute top-6 right-6 text-sm px-4 py-2 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-700 hover:bg-white/100 hover:border-slate-300 transition-colors"
        >
          Đăng xuất
        </button>
      )}

      <div className="w-full max-w-5xl flex flex-col items-center">
        <img
          src={logoDataUrl}
          alt="Tiếng Anh Ms. Hồng Logo"
          className="h-36 w-36 md:h-40 md:w-40 rounded-full shadow-xl mx-auto"
        />

        <div className="text-center mt-8 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 leading-tight">
            Chào mừng bạn!
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Để tiếp tục, vui lòng chọn vai trò của bạn trong hệ thống chấm điểm Speaking của Ms Hồng.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-10 w-full">
          <RoleCard
            onClick={() => onPick('student')}
            title="Tôi là Học sinh"
            description="Nộp bài nói, nhận điểm và phản hồi từ AI."
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            }
          />
          <RoleCard
            onClick={() => onPick('teacher')}
            title="Tôi là Giáo viên"
            description="Quản lý lớp học, giao bài và theo dõi tiến độ học sinh."
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
