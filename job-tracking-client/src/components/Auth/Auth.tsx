/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Auth: React.FC = () => {
  const [isLogin, ] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { setIsAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    fullName: '',
    department: '',
    title: '',
    phone: '',
    position: '',
    profileImage: ''
  });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Form verilerini kontrol et
    if (!formData.username || !formData.password) {
      alert('Lütfen kullanıcı adı ve şifre giriniz');
      return;
    }

    // Loading durumunu aktif et
    setIsLoading(true);

    try {
      // Login isteği
      const loginResponse = await fetch('http://localhost:5193/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(data.message || 'Giriş yapılırken bir hata oluştu');
      }

      // Token'ı kaydet
      localStorage.setItem('token', data.token);

      // Preloading durumunu kontrol et
      let preloadingComplete = false;
      let retryCount = 0;
      const maxRetries = 10;
      const retryInterval = 1000;

      while (!preloadingComplete && retryCount < maxRetries) {
        try {
          const checkResponse = await fetch('https://miajobmanagementsystem.onrender.com/api/auth/check-preload-status', {
            headers: {
              'Authorization': `Bearer ${data.token}`,
            },
          });

          if (checkResponse.ok) {
            const statusData = await checkResponse.json();
            preloadingComplete = statusData.isComplete;
          }

          if (!preloadingComplete) {
            await new Promise(resolve => setTimeout(resolve, retryInterval));
            retryCount++;
          }
        } catch (error) {
          console.error('Preloading check error:', error);
          break;
        }
      }

      // Preloading tamamlandıktan sonra yönlendir
      setIsAuthenticated(true);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Auth error:', error);
      alert(error.message || 'Giriş yapılırken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, [formData, navigate, setIsAuthenticated]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                name="username"
                required
                disabled={isLoading}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${
                  isLoading ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''
                }`}
                placeholder="Kullanıcı Adı"
                value={formData.username}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <input
                type="password"
                name="password"
                required
                disabled={isLoading}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${
                  isLoading ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''
                }`}
                placeholder="Şifre"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white transition-all duration-150 ${
                isLoading 
                  ? 'bg-blue-400 cursor-not-allowed opacity-75' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              <span className={`${isLoading ? 'opacity-75' : ''}`}>
                {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth; 