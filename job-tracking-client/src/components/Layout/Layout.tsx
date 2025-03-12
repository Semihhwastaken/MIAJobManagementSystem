import React, { useContext, useRef, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { NotificationCenter } from '../Notifications/NotificationCenter';
import { resetState } from '../../redux/features/actions';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated } = useContext(AuthContext);
  const dispatch = useDispatch();
  const { isDarkMode, toggleTheme } = useTheme();
  const isAuthPage = location.pathname === '/auth';
  const user = useSelector((state: RootState) => state.auth.user);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Oturum bilgisi bulunamadı');
      }

      // Tüm Redux state'i sıfırla
      dispatch(resetState());

      // Önce storage'ı temizle
      localStorage.clear();
      sessionStorage.clear();

      // IndexedDB önbelleklerini temizle
      if ('caches' in window) {
        try {
          const cacheNames = await window.caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => window.caches.delete(cacheName))
          );
          console.log('Browser cache temizlendi');
        } catch (e) {
          console.error('Browser cache temizlenirken hata:', e);
        }
      }

      // Sonra state'i güncelle
      setIsAuthenticated(false);

      // API çağrısını yap
      try {
        await fetch('http://localhost:5193/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
      } catch (error) {
        console.error('Logout API error:', error);
      }

      // En son yönlendirmeyi yap
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      
      // Hata durumunda da temizlik yap
      dispatch(resetState());
      localStorage.clear();
      sessionStorage.clear();
      setIsAuthenticated(false);
      navigate('/auth', { replace: true });
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/', label: 'Ana Sayfa' },
    { path: '/tasks', label: 'Görevler' },
    { path: '/team', label: 'Ekip' },
    { path: '/calendar', label: 'Takvim' },
    { path: '/chat', label: 'Mesajlar' },
  ];

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      {!isAuthPage && isAuthenticated && (
        <nav className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} shadow-md transition-colors duration-200`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo and Brand */}
              <div className="flex items-center">
                <Link to="/" className="flex items-center">
                  <svg
                    className="h-8 w-8 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <span className={`ml-2 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    İş Takip Sistemi
                  </span>
                </Link>
              </div>

              {/* Navigation Links */}
              <div className="hidden md:flex items-center space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out relative
                      ${location.pathname === item.path
                        ? 'text-blue-500'
                        : isDarkMode
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Right side buttons */}
              <div className="flex items-center space-x-4">
                {/* Theme Toggle Button */}
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  aria-label="Toggle Theme"
                >
                  {isDarkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>

                {/* Notification Center */}
                <NotificationCenter />

                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleDropdown}
                    className={`flex items-center space-x-2 p-1 rounded-full transition-colors border ${isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-300'
                      }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white overflow-hidden">
                      {user?.profileImage ? (
                        <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-10 ${
                      isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                    }`}>
                      <div className={`px-4 py-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {user?.fullName || 'Kullanıcı'}
                        </p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {user?.email || 'email@example.com'}
                        </p>
                      </div>
                      
                      <Link to="/profile" className={`block px-4 py-2 text-sm ${
                        isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                      }`}>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profil
                        </div>
                      </Link>
                      
                      <Link to="/subscription" className={`block px-4 py-2 text-sm ${
                        isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                      }`}>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                          {user?.subscriptionPlan === 'basic' ? 'Planı Yükselt' : 'Abonelik'}
                        </div>
                      </Link>
                      
                      <button 
                        onClick={handleLogout}
                        className={`w-full text-left block px-4 py-2 text-sm ${
                          isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Çıkış Yap
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
