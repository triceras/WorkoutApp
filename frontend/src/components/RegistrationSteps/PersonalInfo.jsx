// src/components/RegistrationSteps/PersonalInfo.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
} from '@mui/material';
import { useFormikContext } from 'formik';
import PropTypes from 'prop-types';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import axiosInstance from '../../api/axiosInstance';
import debounce from 'lodash.debounce';
import InfoIcon from '@mui/icons-material/Info';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';

function PersonalInfo() {
  const { values, errors, touched, handleChange, handleBlur, setFieldError, setFieldTouched, setFieldValue } = useFormikContext();
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

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
          } else {
            setEmailAvailable(false);
            setFieldError('email', 'This email is already registered. Please use a different email or login to your existing account.');
          }
        } catch (error) {
          console.error('Error checking email availability:', error);
          setCheckingEmail(false);
          setEmailAvailable(null);
          setFieldError('email', 'Unable to verify email availability. Please try again.');
        }
      } else {
        setEmailAvailable(null);
        setCheckingEmail(false);
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
    }
  };

  useEffect(() => {
    // Call the debounced function when email changes
    if (values.email) {
      debouncedCheckEmail(values.email);
    } else {
      setEmailAvailable(null);
      setCheckingEmail(false);
    }
  }, [values.email]);

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
        />

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
                <Tooltip title="Please use a valid email address that hasn't been registered before">
                  <IconButton size="small" style={{ marginLeft: 8 }}>
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />

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
          inputProps={{ min: 1 }}
        />

        <FormControl 
          fullWidth
          error={touched.sex && Boolean(errors.sex)}
        >
          <InputLabel id="sex-label" required>Sex</InputLabel>
          <Select
            labelId="sex-label"
            name="sex"
            value={values.sex}
            onChange={handleChange}
            onBlur={handleBlur}
            label="Sex"
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
          inputProps={{ min: 1 }}
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
          inputProps={{ min: 1 }}
        />
      </Box>
    </Box>
  );
}

export default PersonalInfo;
