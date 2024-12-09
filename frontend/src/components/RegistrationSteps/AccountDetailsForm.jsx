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
  Popper,
  Paper,
  Fade,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import axiosInstance from '../../api/axiosInstance';
import debounce from 'lodash.debounce';

function AccountDetailsForm() {
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
  const [popperMessage, setPopperMessage] = useState({
    show: false,
    message: '',
    severity: 'info'
  });
  const usernameFieldRef = useRef(null);

  // useRef to store the debounced function
  const debouncedCheckUsername = useRef(
    debounce(async (username) => {
      if (username && username.length >= 3) {
        setCheckingUsername(true);
        try {
          const response = await axiosInstance.get('check_username/', {
            params: { username },
          });
          if (response.data.available) {
            setUsernameAvailable(true);
            setFieldError('username', undefined);
            setPopperMessage({
              show: true,
              message: 'Username is available!',
              severity: 'success'
            });
          } else {
            setUsernameAvailable(false);
            setFieldError('username', 'Username has already been taken.');
            setPopperMessage({
              show: true,
              message: 'This username is already taken. Please choose a different one.',
              severity: 'error'
            });
          }
        } catch (error) {
          console.error('Error checking username availability:', error);
          setUsernameAvailable(null);
          setFieldError('username', 'Error checking username availability.');
          setPopperMessage({
            show: true,
            message: 'Error checking username availability. Please try again.',
            severity: 'error'
          });
        } finally {
          setCheckingUsername(false);
        }
      } else {
        setUsernameAvailable(null);
        setFieldError('username', null);
        setPopperMessage({ show: false, message: '', severity: 'info' });
      }
    }, 500)
  ).current;

  useEffect(() => {
    // Call the debounced function when username changes
    debouncedCheckUsername(values.username);
  }, [values.username]);

  // Handle click outside to close popper
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (usernameFieldRef.current && !usernameFieldRef.current.contains(event.target)) {
        setPopperMessage(prev => ({ ...prev, show: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <Box width="100%" maxWidth="600px" margin="0 auto">
      <Typography variant="h5" gutterBottom>
        Account Details
      </Typography>
      
      <Box ref={usernameFieldRef} position="relative">
        <TextField
          label="Username"
          name="username"
          value={values.username}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.username && Boolean(errors.username)}
          helperText={touched.username && errors.username}
          fullWidth
          margin="normal"
          required
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {checkingUsername ? (
                  <CircularProgress size={24} />
                ) : usernameAvailable ? (
                  <CheckCircleIcon color="success" />
                ) : usernameAvailable === false ? (
                  <CancelIcon color="error" />
                ) : (
                  <Tooltip title="Enter a unique username">
                    <IconButton>
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </InputAdornment>
            ),
          }}
        />
        <Popper
          open={popperMessage.show}
          anchorEl={usernameFieldRef.current}
          placement="right"
          transition
          style={{ zIndex: 1300 }}
        >
          {({ TransitionProps }) => (
            <Fade {...TransitionProps} timeout={350}>
              <Paper 
                elevation={3}
                sx={{
                  p: 1,
                  ml: 1,
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: -10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    borderWidth: 5,
                    borderStyle: 'solid',
                    borderColor: 'transparent',
                    borderRightColor: 'background.paper'
                  }
                }}
              >
                <Alert 
                  severity={popperMessage.severity}
                  sx={{ 
                    '& .MuiAlert-message': { 
                      padding: '5px 0',
                      minWidth: '200px'
                    }
                  }}
                >
                  {popperMessage.message}
                </Alert>
              </Paper>
            </Fade>
          )}
        </Popper>
      </Box>

      <TextField
        label="Password"
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.password && Boolean(errors.password)}
        helperText={touched.password && errors.password}
        fullWidth
        margin="normal"
        required
      />
      <TextField
        label="Confirm Password"
        name="confirmPassword"
        type="password"
        value={values.confirmPassword}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.confirmPassword && Boolean(errors.confirmPassword)}
        helperText={touched.confirmPassword && errors.confirmPassword}
        fullWidth
        margin="normal"
        required
      />
    </Box>
  );
}

export default AccountDetailsForm;
