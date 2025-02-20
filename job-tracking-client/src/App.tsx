import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material';
import { CssBaseline } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import Auth from './pages/Auth';
import Layout from './components/Layout/Layout';
import Home from './pages/Home/Home';
import Tasks from './pages/Tasks/Tasks';
import Team from './pages/Team/Team';
import Dashboard from './pages/Dashboard';
import { AuthContext } from './context/AuthContext';
import { useEffect } from 'react';
import Main from './pages/Main/Main';

const theme = createTheme({
  palette: {
    mode: 'dark',
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
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('token') !== null
  );

  useEffect(() => {
    console.log(isAuthenticated);
  }, [isAuthenticated, setIsAuthenticated]);
  /**
   * Ana uygulama bileşeni
   * Routing ve genel uygulama yapısını içerir
   */
  function App() {
    return (
      <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
            <Router>
              <div style={{ minHeight: '100vh', width: '100vw', backgroundColor: '#000000' }}>
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
                      path="/analytics"
                      element={<div>Raporlar Sayfası (Yapım aşamasında)</div>}
                    />
                  </Routes>
                </Layout>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 3000,
                    style: {
                      background: '#333',
                      color: '#fff',
                    },
                  }}
                />
              </div>
            </Router>
          </AuthContext.Provider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    );
  }

  export default App;
