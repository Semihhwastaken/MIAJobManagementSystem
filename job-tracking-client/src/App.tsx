import React, { useState, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, setToken, setDataPreloaded } from './redux/features/authSlice';
import { getCurrentUser } from './services/api';
import { CssBaseline } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import Auth from './pages/Auth/Auth';
import Layout from './components/Layout/Layout';
import Home from './pages/Home/Home';
import Tasks from './pages/Tasks/Tasks';
import Team from './pages/Team/Team';
import Dashboard from './pages/Dashboard/Dashboard';
import Calendar from './pages/Calendar/Calendar';
import Chat from './pages/Chat/Chat';
import { AuthContext } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Profile from './pages/Profile/Profile';
import TeamInvite from './pages/TeamInvite/TeamInvite';
import Main from './pages/Main/Main';
import { SnackbarProvider } from 'notistack';
import { RootState } from './redux/store';
import { fetchTasks } from './redux/features/tasksSlice';
import { AppDispatch } from './redux/store';
import FeedbackButton from './components/Feedback/FeedbackButton';
import AdminDashboard from './pages/Admin/AdminDashboard';

const AppContent: React.FC = () => {
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('token') !== null
  );
  const { user, dataPreloaded } = useSelector((state: RootState) => state.auth);

  // Load stored auth data on startup
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        dispatch(setToken(token));
        dispatch(setUser(user));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
      }
    }
  }, [dispatch]);

  // Listen for auth errors
  useEffect(() => {
    const handleAuthError = () => {
      setIsAuthenticated(false);
      window.location.href = '/auth';
    };

    window.addEventListener('authError', handleAuthError);
    return () => {
      window.removeEventListener('authError', handleAuthError);
    };
  }, []);

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Kullanıcı bilgilerini yükle
  useEffect(() => {
    const loadUserData = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await getCurrentUser();
          if (response.user) {
            console.log('Current user data:', response.user); // Debug log
            dispatch(setUser(response.user));
          }
        } catch (error) {
          console.error('Kullanıcı bilgileri yüklenirken hata oluştu:', error);
        }
      }
    };

    loadUserData();
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && user && !dataPreloaded) {
      // Preload işlemini başlat
      Promise.all([
        dispatch(fetchTasks()),
        // Diğer gerekli verileri yükle
      ]).then(() => {
        dispatch(setDataPreloaded(true));
      }).catch((error) => {
        console.error('Veri ön yükleme hatası:', error);
      });
    }
  }, [isAuthenticated, user, dataPreloaded, dispatch]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? 'dark' : 'light',
          primary: {
            main: '#2196f3',
            light: '#64b5f6',
            dark: '#1976d2',
          },
          secondary: {
            main: '#3f51b5',
            light: '#7986cb',
            dark: '#303f9f',
          },
          background: {
            default: isDarkMode ? '#121212' : '#ffffff',
            paper: isDarkMode ? '#1e1e1e' : '#ffffff',
          },
        },
      }),
    [isDarkMode]
  );

  /**
   * Ana uygulama bileşeni
   * Routing ve genel uygulama yapısını içerir
   */
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <div className={`min-h-screen w-screen transition-colors duration-200 ${isDarkMode ? 'dark bg-gray-900' : 'bg-white'}`}>
        <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
          <Router>
            <Layout>
              <Routes>
                <Route
                  path="/"
                  element={
                    isAuthenticated ? (
                      <Home />
                    ) : (
                      <Navigate to="/auth" replace />
                    )
                  }
                />
                <Route
                  path="/auth"
                  element={
                    !isAuthenticated ? (
                      <Layout>
                        <Main />
                      </Layout>
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route
                  path="/login"
                  element={
                    !isAuthenticated ? (
                      <Auth />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route

                  path="/profile"
                  element={
                    isAuthenticated ? (
                      <Profile />
                    ) : (
                      <Navigate to="/auth" replace />
                    )
                  }
                />
                <Route

                  path="/dashboard"
                  element={
                    isAuthenticated ? (
                      <Dashboard />
                    ) : (
                      <Navigate to="/auth" replace />
                    )
                  }
                />
                <Route
                  path="/"
                  element={
                    isAuthenticated ? (
                      <Home />
                    ) : (
                      <Navigate to="/auth" replace />
                    )
                  }
                />
                <Route
                  path="/tasks"
                  element={
                    isAuthenticated ? (
                      <Tasks />
                    ) : (
                      <Navigate to="/auth" replace />
                    )
                  }
                />
                <Route
                  path="/teams"
                  element={
                    !isAuthenticated ? (
                      <Team />
                    ) : (
                      <Navigate to="/auth" replace />
                    )
                  }
                />
                <Route
                  path="/team/join-with-code/:inviteCode"
                  element={
                    isAuthenticated ? (
                      <TeamInvite />
                    ) : (
                      <Navigate to="/auth" replace />
                    )
                  }
                />
                <Route
                  path="/team"
                  element={
                    isAuthenticated ? (
                      <Team />
                    ) : (
                      <Navigate to="/auth" replace />
                    )
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    isAuthenticated ? (
                      <Calendar />
                    ) : (
                      <Navigate to="/auth" replace />
                    )
                  }
                />
                <Route
                  path="/chat"
                  element={
                    isAuthenticated ? (
                      <Chat />
                    ) : (
                      <Navigate to="/auth" replace />
                    )
                  }
                />
                <Route
                  path="/analytics"
                  element={<div>Raporlar Sayfası (Yapım aşamasında)</div>}
                />
                <Route
                  path="/team-invite"
                  element={
                    isAuthenticated ? (
                      <TeamInvite />
                    ) : (
                      <Navigate to="/auth" replace />
                    )
                  }
                />
                <Route
                  path="/admin"
                  element={
                    isAuthenticated && user?.role === 'Admin' ? (
                      (() => {
                        console.log('User role:', user?.role); // Add this debug log
                        return <AdminDashboard />;
                      })()
                    ) : (
                      (() => {
                        console.log('Access denied. Auth:', isAuthenticated, 'Role:', user?.role); // Add this debug log
                        return <Navigate to="/" replace />;
                      })()
                    )
                  }
                />
              </Routes>
            </Layout>
          </Router>
        </AuthContext.Provider>
        <FeedbackButton />
      </div>
      <Toaster position="top-right" />
    </MuiThemeProvider>
  );
};

const App: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize auth state from localStorage
    const token = localStorage.getItem('token');
    const userDataStr = localStorage.getItem('user');
    
    if (token && userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        dispatch(setToken(token));
        dispatch(setUser({
          id: userData.id,
          username: userData.username,
          email: userData.email,
          fullName: userData.fullName,
          department: userData.department,
          role: userData.role  // Make sure role is included here
        }));
        console.log('Initialized user data:', userData); // Debug log
      } catch (error) {
        console.error('Error initializing auth state:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, [dispatch]);

  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      <ThemeProvider>
        <SnackbarProvider 
          maxSnack={3} 
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <AppContent />
        </SnackbarProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
};

export default App;