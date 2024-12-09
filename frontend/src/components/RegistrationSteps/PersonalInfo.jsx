// src/components/RegistrationSteps/PersonalInfo.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
  Alert,
  Popper,
  Paper,
  Fade,
} from '@mui/material';
import { useFormikContext } from 'formik';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import axiosInstance from '../../api/axiosInstance';
import debounce from 'lodash.debounce';
import InfoIcon from '@mui/icons-material/Info';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';

function PersonalInfo() {
  const { values, errors, touched, handleChange, handleBlur, setFieldError, setFieldTouched } = useFormikContext();
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [popperMessage, setPopperMessage] = useState({
    show: false,
    message: '',
    severity: 'info'
  });
  const emailFieldRef = useRef(null);

  // useRef to store the debounced function
  const debouncedCheckEmail = useRef(
    debounce(async (email) => {
      if (email && /\S+@\S+\.\S+/.test(email)) {
        setCheckingEmail(true);
        try {
          const response = await axiosInstance.get('check_email/', {
            params: { email },
          });
          setCheckingEmail(false);
          if (!response.data.exists) {
            setEmailAvailable(true);
            setFieldError('email', undefined);
            setPopperMessage({
              show: true,
              message: 'Email is available!',
              severity: 'success'
            });
          } else {
            setEmailAvailable(false);
            setFieldError('email', 'This email is already registered. Please use a different email or login to your existing account.');
            setPopperMessage({
              show: true,
              message: 'This email is already registered. Please use a different email or login.',
              severity: 'error'
            });
          }
        } catch (error) {
          console.error('Error checking email availability:', error);
          setCheckingEmail(false);
          setEmailAvailable(null);
          setFieldError('email', 'Unable to verify email availability. Please try again.');
          setPopperMessage({
            show: true,
            message: 'Error checking email availability. Please try again.',
            severity: 'error'
          });
        }
      } else {
        setEmailAvailable(null);
        setCheckingEmail(false);
        setPopperMessage({ show: false, message: '', severity: 'info' });
      }
    }, 500)
  ).current;

  // Handle email change
  const handleEmailChange = (e) => {
    const email = e.target.value;
    handleChange(e);
    if (email) {
      debouncedCheckEmail(email);
    } else {
      setEmailAvailable(null);
      setCheckingEmail(false);
      setPopperMessage({ show: false, message: '', severity: 'info' });
    }
  };

  useEffect(() => {
    // Call the debounced function when email changes
    if (values.email) {
      debouncedCheckEmail(values.email);
    } else {
      setEmailAvailable(null);
      setCheckingEmail(false);
      setPopperMessage({ show: false, message: '', severity: 'info' });
    }
  }, [values.email]);

  // Handle click outside to close popper
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emailFieldRef.current && !emailFieldRef.current.contains(event.target)) {
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
        Personal Information
      </Typography>
      <Box display="grid" gap={3}>
        <TextField
          fullWidth
          name="firstName"
          label="First Name"
          value={values.firstName}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.firstName && Boolean(errors.firstName)}
          helperText={touched.firstName && errors.firstName}
          required
          inputProps={{
            autoComplete: "given-name"
          }}
        />

        <TextField
          fullWidth
          name="lastName"
          label="Last Name"
          value={values.lastName}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.lastName && Boolean(errors.lastName)}
          helperText={touched.lastName && errors.lastName}
          required
          inputProps={{
            autoComplete: "family-name"
          }}
        />

        <Box ref={emailFieldRef} position="relative">
          <TextField
            fullWidth
            id="email"
            name="email"
            label="Email"
            value={values.email}
            onChange={handleEmailChange}
            onBlur={handleBlur}
            error={touched.email && (!!errors.email || emailAvailable === false)}
            helperText={
              touched.email && errors.email ? errors.email : 
              checkingEmail ? "Checking email availability..." :
              emailAvailable === false ? "This email is already registered" :
              emailAvailable === true ? "Email is available" : ""
            }
            margin="normal"
            inputProps={{
              autoComplete: "email"
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {checkingEmail ? (
                    <CircularProgress size={20} />
                  ) : emailAvailable === true ? (
                    <CheckCircleIcon color="success" />
                  ) : emailAvailable === false ? (
                    <CancelIcon color="error" />
                  ) : null}
                </InputAdornment>
              ),
            }}
            required
          />
          <Popper
            open={popperMessage.show}
            anchorEl={emailFieldRef.current}
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
          fullWidth
          name="age"
          label="Age"
          type="number"
          value={values.age}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.age && Boolean(errors.age)}
          helperText={touched.age && errors.age}
          required
          inputProps={{
            min: 13,
            max: 120
          }}
        />

        <FormControl fullWidth required error={touched.sex && Boolean(errors.sex)}>
          <InputLabel id="sex-label">Sex</InputLabel>
          <Select
            labelId="sex-label"
            name="sex"
            value={values.sex}
            label="Sex"
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <MenuItem value="Male">Male</MenuItem>
            <MenuItem value="Female">Female</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
            <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
          </Select>
          {touched.sex && errors.sex && (
            <FormHelperText>{errors.sex}</FormHelperText>
          )}
        </FormControl>

        <TextField
          fullWidth
          name="weight"
          label="Weight (kg)"
          type="number"
          value={values.weight}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.weight && Boolean(errors.weight)}
          helperText={touched.weight && errors.weight}
          required
          inputProps={{
            min: 30,
            max: 300,
            step: 0.1
          }}
        />

        <TextField
          fullWidth
          name="height"
          label="Height (cm)"
          type="number"
          value={values.height}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.height && Boolean(errors.height)}
          helperText={touched.height && errors.height}
          required
          inputProps={{
            min: 100,
            max: 250,
            step: 0.1
          }}
        />
      </Box>
    </Box>
  );
}

export default PersonalInfo;
