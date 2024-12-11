// src/components/RegistrationSteps/AccountDetailsForm.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useFormikContext } from 'formik';
import {
  TextField,
  InputAdornment,
  Tooltip,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Stack,
  useTheme,
  alpha,
  LinearProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import axiosInstance from '../../api/axiosInstance';
import debounce from 'lodash.debounce';

function AccountDetailsForm() {
  const theme = useTheme();
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setFieldError,
    setFieldTouched,
  } = useFormikContext();
  
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [usernameMessage, setUsernameMessage] = useState({
    show: false,
    message: '',
    severity: 'info'
  });
  const [emailMessage, setEmailMessage] = useState({
    show: false,
    message: '',
    severity: 'info'
  });
  const usernameFieldRef = useRef(null);
  const emailFieldRef = useRef(null);

  const checkUsername = async (username) => {
    if (username && username.length >= 3) {
      setCheckingUsername(true);
      try {
        const response = await axiosInstance.get('check_username/', {
          params: { username },
        });
        if (response.data.available) {
          setUsernameAvailable(true);
          setFieldError('username', undefined);
          setUsernameMessage({
            show: true,
            message: 'Username is available!',
            severity: 'success'
          });
        } else {
          setUsernameAvailable(false);
          setFieldError('username', 'Username has already been taken.');
          setUsernameMessage({
            show: true,
            message: 'This username is already taken. Please choose a different one.',
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('Error checking username availability:', error);
        setUsernameAvailable(false);
        setUsernameMessage({
          show: true,
          message: 'Error checking username availability',
          severity: 'error'
        });
      } finally {
        setCheckingUsername(false);
      }
    } else {
      setUsernameAvailable(null);
      setUsernameMessage({ show: false, message: '', severity: 'info' });
    }
  };

  const checkEmail = async (email) => {
    if (email && email.length >= 5) {
      setCheckingEmail(true);
      try {
        const response = await axiosInstance.get('check_email/', {
          params: { email },
        });
        if (response.data.available) {
          setEmailAvailable(true);
          setFieldError('email', undefined);
          setEmailMessage({
            show: true,
            message: 'Email is available!',
            severity: 'success'
          });
        } else {
          setEmailAvailable(false);
          setFieldError('email', 'Email has already been taken.');
          setEmailMessage({
            show: true,
            message: 'This email is already registered. Please use a different one.',
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('Error checking email availability:', error);
        setEmailAvailable(false);
        setEmailMessage({
          show: true,
          message: 'Error checking email availability',
          severity: 'error'
        });
      } finally {
        setCheckingEmail(false);
      }
    } else {
      setEmailAvailable(null);
      setEmailMessage({ show: false, message: '', severity: 'info' });
    }
  };

  const debouncedCheckUsername = useRef(
    debounce((value) => checkUsername(value), 500)
  ).current;

  const debouncedCheckEmail = useRef(
    debounce((value) => checkEmail(value), 500)
  ).current;

  useEffect(() => {
    // Cleanup debounced functions
    return () => {
      debouncedCheckUsername.cancel();
      debouncedCheckEmail.cancel();
    };
  }, []);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 25;
    if (password.match(/[^A-Za-z0-9]/)) strength += 25;
    return strength;
  };

  const getPasswordStrengthColor = (strength) => {
    if (strength <= 25) return '#ff4444';
    if (strength <= 50) return '#ffbb33';
    if (strength <= 75) return '#00C851';
    return '#007E33';
  };

  useEffect(() => {
    debouncedCheckUsername(values.username);
  }, [values.username]);

  useEffect(() => {
    debouncedCheckEmail(values.email);
  }, [values.email]);

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(values.password));
  }, [values.password]);

  // Handle click outside to close poppers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (usernameFieldRef.current && !usernameFieldRef.current.contains(event.target)) {
        setUsernameMessage(prev => ({ ...prev, show: false }));
      }
      if (emailFieldRef.current && !emailFieldRef.current.contains(event.target)) {
        setEmailMessage(prev => ({ ...prev, show: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: 600,
        mx: 'auto',
        p: 3,
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 'bold', color: theme.palette.primary.main }}>
        Create Your Account
      </Typography>
      
      <Card
        elevation={3}
        sx={{
          width: '100%',
          borderRadius: 2,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[6],
          },
        }}
      >
        <CardContent>
          <Stack spacing={3}>
            <TextField
              fullWidth
              name="username"
              label="Username"
              value={values.username}
              onChange={(e) => {
                handleChange(e);
                debouncedCheckUsername(e.target.value);
              }}
              onBlur={handleBlur}
              error={touched.username && Boolean(errors.username)}
              helperText={touched.username && errors.username}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {checkingUsername && <CircularProgress size={20} />}
                    {!checkingUsername && usernameAvailable === true && (
                      <CheckCircleIcon color="success" />
                    )}
                    {!checkingUsername && usernameAvailable === false && (
                      <CancelIcon color="error" />
                    )}
                  </InputAdornment>
                ),
              }}
              ref={usernameFieldRef}
            />

            <TextField
              fullWidth
              name="email"
              label="Email"
              type="email"
              value={values.email}
              onChange={(e) => {
                handleChange(e);
                debouncedCheckEmail(e.target.value);
              }}
              onBlur={handleBlur}
              error={touched.email && Boolean(errors.email)}
              helperText={touched.email && errors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {checkingEmail && <CircularProgress size={20} />}
                    {!checkingEmail && emailAvailable === true && (
                      <CheckCircleIcon color="success" />
                    )}
                    {!checkingEmail && emailAvailable === false && (
                      <CancelIcon color="error" />
                    )}
                  </InputAdornment>
                ),
              }}
              ref={emailFieldRef}
            />

            <Box>
              <TextField
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={values.password}
                onChange={(e) => {
                  handleChange(e);
                  setPasswordStrength(calculatePasswordStrength(e.target.value));
                }}
                onBlur={handleBlur}
                error={touched.password && Boolean(errors.password)}
                helperText={touched.password && errors.password}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {values.password && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={passwordStrength}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: alpha(theme.palette.grey[300], 0.5),
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getPasswordStrengthColor(passwordStrength),
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.5,
                      display: 'block',
                      color: getPasswordStrengthColor(passwordStrength),
                    }}
                  >
                    Password Strength: {passwordStrength <= 25 ? 'Weak' : passwordStrength <= 50 ? 'Fair' : passwordStrength <= 75 ? 'Good' : 'Strong'}
                  </Typography>
                </Box>
              )}
            </Box>

            <TextField
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={values.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.confirmPassword && Boolean(errors.confirmPassword)}
              helperText={touched.confirmPassword && errors.confirmPassword}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>

          {(usernameMessage.show || emailMessage.show) && (
            <Box sx={{ mt: 2 }}>
              {usernameMessage.show && (
                <Alert severity={usernameMessage.severity} sx={{ mb: 1 }}>
                  {usernameMessage.message}
                </Alert>
              )}
              {emailMessage.show && (
                <Alert severity={emailMessage.severity}>
                  {emailMessage.message}
                </Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default AccountDetailsForm;
