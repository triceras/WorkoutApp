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
} from '@mui/material'; // Combined imports
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import axiosInstance from '../../api/axiosInstance';
import debounce from 'lodash.debounce';
import PropTypes from 'prop-types';

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
  ).current;

  // Effect to check username availability when username changes
  useEffect(() => {
    if (touched.username) {
      debouncedCheckUsername(values.username);
    }
    // Cleanup function to cancel debounce on unmount
    return () => {
      debouncedCheckUsername.cancel();
    };
  }, [values.username, touched.username, debouncedCheckUsername]);

  // Function to check if the current step's fields are valid
  const isStepValid = () => {
    const requiredFields = ['username', 'password', 'confirmPassword'];
    return (
      requiredFields.every(
        (field) => touched[field] && !errors[field] && values[field] !== ''
      ) && usernameAvailable === true
    );
  };

  return (
    <Box width="100%" maxWidth="600px" margin="0 auto">
      <Typography variant="h5" gutterBottom>
        Account Details
      </Typography>

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

      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="flex-end" marginTop="20px">
        <Button
          variant="contained"
          color="primary"
          onClick={() => nextStep(values)}
          disabled={!isStepValid()}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
}

AccountDetailsForm.propTypes = {
  nextStep: PropTypes.func.isRequired,
};

export default AccountDetailsForm;
