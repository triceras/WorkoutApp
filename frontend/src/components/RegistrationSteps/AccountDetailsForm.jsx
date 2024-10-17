// src/components/RegistrationSteps/AccountDetailsForm.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useFormikContext } from 'formik';
import { TextField, Button, InputAdornment, Tooltip, IconButton } from '@mui/material'; // Combined imports
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import axiosInstance from '../../api/axiosInstance';
import debounce from 'lodash.debounce';

function AccountDetailsForm({ nextStep }) {
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

  // Debounced function to check username availability
  const checkUsernameAvailability = useCallback(
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
        } finally {
          setCheckingUsername(false);
        }
      } else {
        setUsernameAvailable(null);
        setFieldError('username', null);
      }
    }, 500),
    [setFieldError]
  );

  // Effect to check username availability when username changes
  useEffect(() => {
    if (touched.username) {
      checkUsernameAvailability(values.username);
    }
    // Cleanup function to cancel debounce on unmount
    return () => {
      checkUsernameAvailability.cancel();
    };
  }, [values.username, touched.username, checkUsernameAvailability]);

  return (
    <div>
      <h2>Create an Account</h2>
      <TextField
        name="username"
        label="Username"
        fullWidth
        margin="normal"
        required
        onChange={(e) => {
          handleChange(e);
          setFieldTouched('username', true, false);
        }}
        onBlur={handleBlur}
        value={values.username}
        error={touched.username && Boolean(errors.username)}
        helperText={touched.username && errors.username}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {checkingUsername ? null : usernameAvailable === true ? (
                <CheckCircleIcon style={{ color: 'green' }} />
              ) : usernameAvailable === false ? (
                <CancelIcon style={{ color: 'red' }} />
              ) : null}
            </InputAdornment>
          ),
        }}
      />

      <TextField
        name="password"
        label="Password"
        type="password"
        fullWidth
        margin="normal"
        required
        onChange={handleChange}
        onBlur={handleBlur}
        value={values.password}
        error={touched.password && Boolean(errors.password)}
        helperText={touched.password && errors.password}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Password must be at least 6 characters long.">
                <IconButton>
                  <InfoIcon />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />

      <TextField
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        fullWidth
        margin="normal"
        required
        onChange={handleChange}
        onBlur={handleBlur}
        value={values.confirmPassword}
        error={touched.confirmPassword && Boolean(errors.confirmPassword)}
        helperText={touched.confirmPassword && errors.confirmPassword}
      />

      <div style={{ marginTop: '20px' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={nextStep}
          disabled={
            !values.username ||
            Boolean(errors.username) ||
            !usernameAvailable ||
            !values.password ||
            Boolean(errors.password) ||
            !values.confirmPassword ||
            Boolean(errors.confirmPassword)
          }
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default AccountDetailsForm;
