import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import ListIcon from '@mui/icons-material/List';
import LoginDialog from '../components/LoginDialog';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const MIN_WIDTH = 1200;

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loginOpen, setLoginOpen] = useState(false);
  const [userName, setUserName] = useState(null);

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    if (storedName) setUserName(storedName);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUserName(userData.UserName);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUserName(null);
  };

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: `${MIN_WIDTH}px`,
        height: '100vh',
        overflowX: 'auto',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
      }}
    >
      {/* NAVBAR */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: '#1a3a5c',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}
      >
        <Toolbar
          sx={{
            minHeight: '42px !important',
            px: 2,
            flexWrap: 'nowrap',
            whiteSpace: 'nowrap',
          }}
        >
          {/* TITLE */}
          <Typography
            sx={{
              whiteSpace: 'nowrap',
              flexShrink: 0,
              fontWeight: 'bold',
              fontSize: '14px',
              letterSpacing: '0.3px',
              color: 'white',
            }}
          >
            IMS - Inventory Management System 「在庫管理システム」
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {/* NAV BUTTONS */}
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, alignItems: 'center' }}>
            <Button
              color="inherit"
              size="small"
              startIcon={<ListIcon fontSize="small" />}
              onClick={() => navigate('/transactions')}
              sx={{
                fontSize: '13px',
                opacity: location.pathname === '/transactions' || location.pathname === '/' ? 1 : 0.75,
                fontWeight: location.pathname === '/transactions' || location.pathname === '/' ? 'bold' : 'normal',
                borderBottom: location.pathname === '/transactions' || location.pathname === '/'
                  ? '2px solid white' : '2px solid transparent',
                borderRadius: 0,
                pb: '2px',
                '&:hover': { opacity: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
              }}
            >
              取引リスト
            </Button>

            <Button
              color="inherit"
              size="small"
              startIcon={<InventoryIcon fontSize="small" />}
              onClick={() => navigate('/shelf-management')}
              sx={{
                fontSize: '13px',
                opacity: location.pathname === '/shelf-management' ? 1 : 0.75,
                fontWeight: location.pathname === '/shelf-management' ? 'bold' : 'normal',
                borderBottom: location.pathname === '/shelf-management'
                  ? '2px solid white' : '2px solid transparent',
                borderRadius: 0,
                pb: '2px',
                '&:hover': { opacity: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
              }}
            >
              棚管理
            </Button>

            {/* Divider */}
            <Box sx={{ width: '1px', height: 20, backgroundColor: 'rgba(255,255,255,0.25)', mx: 0.5 }} />

            {/* Login / User */}
            {userName ? (
              <>
                <AccountCircleIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.85)' }} />
                <Typography sx={{ whiteSpace: 'nowrap', ml: 0.5, mr: 0.5, fontSize: '13px', color: 'white' }}>
                  {userName}
                </Typography>
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleLogout}
                  sx={{ fontSize: '13px', opacity: 0.85, '&:hover': { opacity: 1 } }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button
                color="inherit"
                size="small"
                onClick={() => setLoginOpen(true)}
                sx={{ fontSize: '13px', opacity: 0.85, '&:hover': { opacity: 1 } }}
              >
                Login
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* CONTENT */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <Container maxWidth={false} sx={{ mt: 2, mb: 4 }}>
          {children}
        </Container>
      </Box>

      {/* FOOTER */}
      <Box
        component="footer"
        sx={{
          backgroundColor: '#1a3a5c',
          color: 'rgba(255,255,255,0.75)',
          textAlign: 'center',
          py: 0.75,
          fontSize: '11px',
          letterSpacing: '0.3px',
          flexShrink: 0,
          boxShadow: '0 -2px 8px rgba(0,0,0,0.2)',
        }}
      >
        IMS — Inventory Management System &nbsp;·&nbsp; Taiyo Yuden
      </Box>

      <LoginDialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </Box>
  );
};

export default MainLayout;