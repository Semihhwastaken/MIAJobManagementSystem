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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [muteNotifications, setMuteNotifications] = useState(localStorage.getItem('muteNotifications') === 'true');
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'tr');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.fullName) return '??';
    return user.fullName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setIsSettingsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on navigation
  useEffect(() => {
    setIsDropdownOpen(false);
    setIsSettingsOpen(false);
  }, [location.pathname]);

  const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
    if (isSettingsOpen) setIsSettingsOpen(false);
  };

  const toggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSettingsOpen(prev => !prev);
  };

  const handleMuteNotifications = () => {
    const newState = !muteNotifications;
    setMuteNotifications(newState);
    localStorage.setItem('muteNotifications', newState.toString());
    // Additional logic to handle notification muting can be added here
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    // Additional logic to change application language can be added here
  };

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
                {/* Notification Center */}
                <NotificationCenter muted={muteNotifications} />

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
                        <span className="font-medium text-sm">{getUserInitials()}</span>
                      )}
                    </div>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className={`absolute right-0 mt-2 w-56 rounded-md shadow-lg py-1 z-50 ${
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

                      {/* Settings Button */}
                      <div className="relative">
                        <button
                          onClick={toggleSettings}
                          className={`w-full text-left block px-4 py-2 text-sm ${
                            isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Ayarlar
                            </div>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>

                        {/* Settings Dropdown */}
                        {isSettingsOpen && (
                          <div className={`absolute right-full top-0 mr-2 w-56 rounded-md shadow-lg py-1 z-60 ${
                            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                          }`}>
                            {/* Dark Mode Toggle */}
                            <button
                              onClick={toggleTheme}
                              className={`w-full text-left block px-4 py-2 text-sm ${
                                isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  {isDarkMode ? (
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                  )}
                                  {isDarkMode ? 'Aydınlık Mod' : 'Karanlık Mod'}
                                </div>
                                {isDarkMode ? (
                                  <span className="inline-block h-4 w-8 rounded-full bg-blue-600"></span>
                                ) : (
                                  <span className="inline-block h-4 w-8 rounded-full bg-gray-300"></span>
                                )}
                              </div>
                            </button>

                            {/* Notification Toggle */}
                            <button
                              onClick={handleMuteNotifications}
                              className={`w-full text-left block px-4 py-2 text-sm ${
                                isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  {muteNotifications ? (
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    </svg>
                                  )}
                                  {muteNotifications ? 'Bildirimleri Aç' : 'Bildirimleri Kapat'}
                                </div>
                                <span className={`inline-block h-4 w-8 rounded-full ${muteNotifications ? 'bg-gray-400' : 'bg-blue-600'}`}></span>
                              </div>
                            </button>

                            {/* Language Selection */}
                            <div className={`px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              <p className="font-medium mb-1">Dil Seçimi</p>
                              <div className="flex space-x-2 mt-1">
                                <button
                                  onClick={() => handleLanguageChange('tr')}
                                  className={`px-2 py-1 rounded text-xs ${
                                    language === 'tr'
                                      ? 'bg-blue-500 text-white'
                                      : isDarkMode
                                        ? 'bg-gray-700 text-gray-300'
                                        : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  Türkçe
                                </button>
                                <button
                                  onClick={() => handleLanguageChange('en')}
                                  className={`px-2 py-1 rounded text-xs ${
                                    language === 'en'
                                      ? 'bg-blue-500 text-white'
                                      : isDarkMode
                                        ? 'bg-gray-700 text-gray-300'
                                        : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  English
                                </button>
                                <button
                                  onClick={() => handleLanguageChange('de')}
                                  className={`px-2 py-1 rounded text-xs ${
                                    language === 'de'
                                      ? 'bg-blue-500 text-white'
                                      : isDarkMode
                                        ? 'bg-gray-700 text-gray-300'
                                        : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  Deutsch
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Logout Button - now with red background */}
                      <button
                        onClick={handleLogout}
                        className={`w-full text-left block px-4 py-2 text-sm text-white ${
                          isDarkMode ? 'bg-red-700 hover:bg-red-800' : 'bg-red-600 hover:bg-red-700'
                        } mt-1`}
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
