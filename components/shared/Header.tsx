import React from 'react';
import { logoDataUrl } from '../../assets/logo';

interface HeaderProps {
  isLoggedIn: boolean;
  username?: string;
  onLogout: () => void;
  onBack: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isLoggedIn, username, onLogout, onBack }) => {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img 
            src={logoDataUrl} 
            alt="Tiếng Anh Ms. Hồng Logo" 
            className="h-12 w-12 rounded-full transition-transform duration-300 hover:scale-110 cursor-pointer"
            onClick={onBack}
            title="Quay lại trang chính"
          />
          <h1 className="text-lg md:text-xl font-bold text-slate-800">
            Hệ thống chấm Điểm Speaking
            <span className="font-semibold text-pink-600"> - Tiếng Anh Ms Hồng</span>
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <>
              <span className="text-sm text-slate-600">Chào, <span className="font-semibold">{username}</span></span>
              <button
                onClick={onLogout}
                className="px-3 py-1 text-sm font-semibold rounded-md transition-colors duration-200 bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Đăng xuất
              </button>
            </>
          ) : (
             <button
                onClick={onBack}
                className="px-3 py-1 text-sm font-semibold rounded-md transition-colors duration-200 bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Quay lại
              </button>
          )}
        </div>
      </div>
    </header>
  );
};