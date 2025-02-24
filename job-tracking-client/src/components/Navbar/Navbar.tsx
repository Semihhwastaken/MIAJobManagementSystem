import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import SignalRService from '../../services/signalRService';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsAuthenticated } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      // Disconnect SignalR
      const signalRService = SignalRService.getInstance();
      await signalRService.stopConnection();

      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('userId');

      // Update auth state
      setIsAuthenticated(false);

      // Navigate to login
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-3">
            <svg
              className="w-8 h-8 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span className="text-xl font-bold text-gray-800">MIA İş Yönetimi</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`${
                isActive('/') ? 'text-blue-500' : 'text-gray-600'
              } hover:text-blue-500 transition-colors duration-200`}
            >
              Ana Sayfa
            </Link>
            <Link
              to="/tasks"
              className={`${
                isActive('/tasks') ? 'text-blue-500' : 'text-gray-600'
              } hover:text-blue-500 transition-colors duration-200`}
            >
              Görevler
            </Link>
            <Link
              to="/team"
              className={`${
                isActive('/team') ? 'text-blue-500' : 'text-gray-600'
              } hover:text-blue-500 transition-colors duration-200`}
            >
              Ekip
            </Link>
            <Link
              to="/analytics"
              className={`${
                isActive('/analytics') ? 'text-blue-500' : 'text-gray-600'
              } hover:text-blue-500 transition-colors duration-200`}
            >
              Raporlar
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-blue-500 transition-colors duration-200"
            >
              Çıkış Yap
            </button>
          </div>

          <div className="md:hidden">
            {/* TODO: Mobile menu button */}
            <button className="text-gray-600 hover:text-blue-500">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
