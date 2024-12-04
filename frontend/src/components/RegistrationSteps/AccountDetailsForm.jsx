// src/components/RegistrationSteps/AccountDetailsForm.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useFormikContext } from 'formik';
import {
  TextField,
  Button,
  InputAdornment,
  Tooltip,
  IconButton,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material'; // Combined imports
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import axiosInstance from '../../api/axiosInstance';
import debounce from 'lodash.debounce';
import PropTypes from 'prop-types';

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
            setFieldError('username', null);
          } else {
            setUsernameAvailable(false);
            setFieldError('username', 'Username has already been in use.');
          }
        } catch (error) {
          console.error('Error checking username availability:', error);
          setUsernameAvailable(null);
          setFieldError('username', 'Error checking username availability.');
        } finally {
          setCheckingUsername(false);
        }
      } else {
        setUsernameAvailable(null);
        setFieldError('username', null);
      }
    }, 500)
  );

  useEffect(() => {
    // Call the debounced function when username changes
    debouncedCheckUsername.current(values.username);
  }, [values.username]);

  return (
    <Box width="100%" maxWidth="600px" margin="0 auto">
      <Typography variant="h5" gutterBottom>
        Account Details
      </Typography>
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
