import React, { useContext } from 'react';
import { AppBar, Toolbar, Typography, Container, Box, IconButton, Button } from '@mui/material';
import { Work, Person, ExitToApp } from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* Header */}
      {!isAuthPage && (
        <AppBar position="static" sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" sx={{ mr: 2 }}>
              <Work />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              İş Takip Sistemi
            </Typography>
            {isAuthenticated && (
              <>
                <IconButton 
                  color="inherit" 
                  sx={{ 
                    mr: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    }
                  }}
                >
                  <Person />
                </IconButton>
                <Button 
                  color="inherit" 
                  startIcon={<ExitToApp />}
                  onClick={handleLogout}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  Çıkış
                </Button>
              </>
            )}
          </Toolbar>
        </AppBar>
      )}

      {/* Main Content */}
      <Container 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflowX: 'hidden',
          maxWidth: '100% !important',
          padding: '0 !important'
        }}
      >
        <Box sx={{ 
          width: '100%', 
          height: '100%',
          overflow: 'auto'
        }}>
          {children}
        </Box>
      </Container>

      {/* Footer */}
      <Box component="footer" sx={{
        py: 2,
        px: 2,
        mt: 'auto',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        overflowX: 'hidden'
      }}>
        <Typography variant="body2" color="white" >
          {new Date().getFullYear()} İş Takip Sistemi. Tüm hakları saklıdır.
        </Typography>
      </Box>
    </Box>
  );
};

export default Layout;
