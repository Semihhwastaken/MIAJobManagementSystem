import React, { useState, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';
import { useDispatch } from 'react-redux';
import { setUser,setToken } from './redux/features/authSlice';
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



const AppContent: React.FC = () => {
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch();
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('token') !== null
  );

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
    } else {
      console.log('No stored auth data found');
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
            dispatch(setUser(response.user));
          }
        } catch (error) {
          console.error('Kullanıcı bilgileri yüklenirken hata oluştu:', error);
        }
      }
    };

    loadUserData();
  }, [dispatch]);

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
              </Routes>
            </Layout>
          </Router>
        </AuthContext.Provider>
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
        console.log('Initializing auth state from localStorage');
        const userData = JSON.parse(userDataStr);
        
        // Set token first
        dispatch(setToken(token));
        
        // Then set user data
        dispatch(setUser({
          id: userData.id,
          username: userData.username,
          email: userData.email,
          fullName: userData.fullName,
          department: userData.department
        }));

        console.log('Auth state initialized successfully');
      } catch (error) {
        console.error('Error initializing auth state:', error);
        // Clear invalid data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    } else {
      console.log('No stored auth data found');
    }
  }, [dispatch]);

  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
};

export default App;