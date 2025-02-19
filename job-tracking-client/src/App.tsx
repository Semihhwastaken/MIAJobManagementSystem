import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material';
import { CssBaseline } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import Auth from './pages/Auth';
import Layout from './components/Layout/Layout';
import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home/Home';
import Tasks from './pages/Tasks/Tasks';
import Team from './pages/Team/Team';
import { AuthContext } from './context/AuthContext';

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

  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
          <Router>
            <div style={{
              minHeight: '100vh',
              width: '100vw',
              background: `linear-gradient(135deg, 
                ${theme.palette.primary.dark} 0%,
                ${theme.palette.primary.main} 25%,
                ${theme.palette.secondary.main} 50%,
                ${theme.palette.primary.light} 75%,
                ${theme.palette.secondary.light} 100%)`,
              backgroundSize: '400% 400%',
              animation: 'gradient 15s ease infinite',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.1,
                background: `radial-gradient(circle at center, transparent 0%, #000 100%)`
              }} />
              {Array.from({ length: 20 }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    width: Math.random() * 20 + 10 + 'px',
                    height: Math.random() * 20 + 10 + 'px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    top: Math.random() * 100 + '%',
                    left: Math.random() * 100 + '%',
                    animation: `float ${Math.random() * 10 + 5}s linear infinite`,
                  }}
                />
              ))}
              <style>
                {`
                  @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                  }
                  @keyframes float {
                    0% { transform: translateY(0) translateX(0); }
                    25% { transform: translateY(-20px) translateX(10px); }
                    50% { transform: translateY(-40px) translateX(0); }
                    75% { transform: translateY(-20px) translateX(-10px); }
                    100% { transform: translateY(0) translateX(0); }
                  }
                `}
              </style>
              <Layout>
                <Navbar />
                <Routes>
                  <Route
                    path="/auth"
                    element={isAuthenticated ? <Navigate to="/" /> : <Auth />}
                  />
                  <Route
                    path="/"
                    element={isAuthenticated ? <Home /> : <Navigate to="/auth" />}
                  />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/team" element={<Team />} />
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
};

export default App;