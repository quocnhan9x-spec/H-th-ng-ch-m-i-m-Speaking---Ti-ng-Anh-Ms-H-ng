import React, { useState } from 'react';
import { Card } from './shared/Card';
import { Button } from './shared/Button';
import { Spinner } from './shared/Spinner';

interface LoginProps {
  onLogin: (username: string, password:string) => Promise<void>;
  onBack: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // onLogin will throw an error if the login fails, which will be caught here.
      await onLogin(username, password);
      // App.tsx handles the successful redirect.
    } catch (err: any) {
      // Display a cleaner error message to the user.
      let errorMessage = err.message || 'Lỗi kết nối hoặc phản hồi không hợp lệ.';
      if (errorMessage.startsWith('Lỗi từ API: ')) {
        errorMessage = errorMessage.substring('Lỗi từ API: '.length);
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderErrorMessage = () => {
    if (!error) return null;

    const isCredentialError = error.toLowerCase().includes('sai tên đăng nhập') || error.toLowerCase().includes('mật khẩu');
    
    return (
        <div className="p-3 my-2 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded-r-md">
            <p className="font-bold">Đăng nhập thất bại</p>
            <p>{error}</p>
            {isCredentialError && (
                <div className="mt-2 text-xs">
                    <p className="font-semibold">Gợi ý:</p>
                    <ul className="list-disc list-inside ml-2">
                        <li>Kiểm tra lại chính tả, chữ hoa/thường.</li>
                        <li>Đảm bảo phím Caps Lock đã tắt.</li>
                        <li>Tạm tắt bộ gõ tiếng Việt (Unikey/Vietkey) khi nhập mật khẩu.</li>
                    </ul>
                    <p className="mt-1">Nếu vẫn không được, vui lòng liên hệ Ms. Hồng để được hỗ trợ.</p>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50 p-4">
      <Card className="w-full max-w-md">
        {/* Tiêu đề */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Đăng nhập hệ thống</h2>
          <p className="text-sm text-slate-500 mt-2">
            Dành cho giáo viên và học sinh của Tiếng Anh Ms Hồng.
          </p>
        </div>

        {/* Form đăng nhập */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-slate-700"
            >
              Tài khoản
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
              placeholder="Nhập tài khoản"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
              placeholder="Nhập mật khẩu"
              required
              autoComplete="current-password"
            />
          </div>

          {renderErrorMessage()}

          {/* Nút hành động */}
          <div className="flex gap-4 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onBack}
              className="w-1/3"
            >
              Quay lại
            </Button>

            <Button type="submit" className="w-2/3" disabled={loading}>
              {loading && <Spinner size="sm" />}
              <span>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};