import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, setIsAuthenticated } = useContext(AuthContext);
  const isAuthPage = location.pathname === '/auth';

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    navigate('/auth');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/', label: 'Ana Sayfa' },
    { path: '/tasks', label: 'Görevler' },
    { path: '/team', label: 'Ekip' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      {!isAuthPage && isAuthenticated && (
        <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
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
                  <span className="ml-2 text-xl font-semibold text-white">İş Takip Sistemi</span>
                </Link>
              </div>

              {/* Navigation Links */}
              <div className="hidden md:flex items-center space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out
                      ${location.pathname === item.path
                        ? 'bg-white/20 text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-4">
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors duration-150 ease-in-out"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white hover:bg-white/20 rounded-md transition-colors duration-150 ease-in-out"
                >
                  <svg
                    className="mr-2 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${!isAuthPage ? 'container mx-auto px-4 py-8' : ''}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
