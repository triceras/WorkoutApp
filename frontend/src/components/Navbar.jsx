// src/components/Navbar.jsx

import React, { useState, useContext, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';
import { 
  useMediaQuery, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  TextField, 
  Button, 
  IconButton,
  Typography,
  Box,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getMenuItems } from '../menuItems';
import axiosInstance from '../api/axiosInstance';

function LoginDialog({ open, onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      // Make the login request
      console.log('Attempting login with:', { username });
      const response = await axiosInstance.post('auth/login/', {
        username: username.trim(),
        password: password.trim(),
      });

      console.log('Login response:', response.data);

      // Check if we have both token and user data
      const { token, user } = response.data;
      if (!token || !user) {
        throw new Error('Server response was incomplete: missing token or user data');
      }

      // Store the token in localStorage and update auth context
      localStorage.setItem('authToken', token);
      await login(token, user);
      
      // Close modal and navigate
      onClose();
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error.response || error);
      
      if (error.response?.data?.non_field_errors) {
        setError(error.response.data.non_field_errors[0]);
      } else if (error.response?.data?.username) {
        setError(`Username error: ${error.response.data.username[0]}`);
      } else if (error.response?.data?.password) {
        setError(`Password error: ${error.response.data.password[0]}`);
      } else if (error.response?.status === 400) {
        setError('Invalid username or password. Please check your credentials and try again.');
      } else if (error.response?.status === 401) {
        setError('Authentication failed. Please check your credentials.');
      } else if (error.message.includes('Server response was incomplete')) {
        setError('Server response was incomplete. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    }
  };

  const handleClose = () => {
    setError('');
    setUsername('');
    setPassword('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Login</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            error={!!error}
            autoFocus
          />
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            error={!!error}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              mt: 2,
              background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #FF8E53 30%, #FF6B6B 90%)',
              },
            }}
          >
            Login
          </Button>
          <Box textAlign="center" mt={2}>
            <Typography variant="body2">
              Don't have an account?{' '}
              <NavLink 
                to="/register" 
                onClick={handleClose}
                style={{ color: '#FF6B6B', textDecoration: 'none' }}
              >
                Register here
              </NavLink>
            </Typography>
          </Box>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Navbar({ isSidebarOpen, setIsSidebarOpen }) {
  const isMobile = useMediaQuery('(max-width:768px)');
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { authToken, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const hideNavbar = location.pathname === '/register';

  const handleLogout = async () => {
    try {
      await axiosInstance.post('logout/');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      logout();
      navigate('/');
    }
  };

  const renderMenuItem = (item) => {
    if (item.label === 'Logout') {
      return (
        <Button
          className="navbar-link"
          onClick={handleLogout}
          sx={{
            textTransform: 'none',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            padding: 'inherit',
          }}
        >
          {item.label}
        </Button>
      );
    }
    return (
      <NavLink
        to={item.path}
        className={({ isActive }) =>
          isActive ? 'navbar-link active-link' : 'navbar-link'
        }
        onClick={() => setIsOpen(false)}
      >
        {item.label}
      </NavLink>
    );
  };

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setIsScrolled(offset > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (hideNavbar) {
    return null;
  }

  const menuItems = getMenuItems(authToken);

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} aria-label="Main Navigation">
        <div className="navbar-container">
          {isMobile && (
            <button
              className="navbar-sidebar-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
          )}

          <div className="navbar-logo">
            <NavLink to="/" aria-label="MyFitnessApp Home">
              MyFitnessApp
            </NavLink>
          </div>

          <button
            className={`navbar-hamburger ${isOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
          >
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </button>

          <ul className={`navbar-menu ${isOpen ? 'active' : ''}`}>
            {menuItems.map((item) => (
              <li className="navbar-item" key={item.path}>
                {renderMenuItem(item)}
              </li>
            ))}
            {!authToken && (
              <>
                <li className="navbar-item">
                  <Button
                    onClick={() => setLoginOpen(true)}
                    variant="outlined"
                    sx={{
                      color: '#1a1a1a',
                      borderColor: '#1a1a1a',
                      '&:hover': {
                        borderColor: '#555555',
                        backgroundColor: 'rgba(26, 26, 26, 0.1)',
                      },
                    }}
                  >
                    Login
                  </Button>
                </li>
                <li className="navbar-item">
                  <NavLink to="/register" className="navbar-link register-btn">
                    Register
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </div>
      </nav>

      <LoginDialog 
        open={loginOpen} 
        onClose={() => setLoginOpen(false)} 
      />
    </>
  );
}

export default Navbar;
