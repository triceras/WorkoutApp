// src/components/RegistrationSteps/PersonalInfo.jsx

import React, { useState, useEffect } from 'react';
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

function PersonalInfo({ nextStep, prevStep }) {
  const { values, errors, touched, handleChange, handleBlur, setFieldError, setFieldTouched } = useFormikContext();
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Debounced function to check email availability
  const checkEmailAvailability = debounce(async (email) => {
    if (email && /\S+@\S+\.\S+/.test(email)) {
      setCheckingEmail(true);
      try {
        const response = await axiosInstance.get('check_email/', {
          params: { email },
        });
        if (response.data.available) {
          setEmailAvailable(true);
          setFieldError('email', null);
        } else {
          setEmailAvailable(false);
          setFieldError('email', 'Email address has already been in use.');
        }
      } catch (error) {
        console.error('Error checking email availability:', error);
      } finally {
        setCheckingEmail(false);
      }
    } else {
      setEmailAvailable(null);
      setFieldError('email', null);
    }
  }, 500); // Adjust debounce delay as needed

  // Effect to check email availability when email changes
  useEffect(() => {
    if (touched.email) {
      checkEmailAvailability(values.email);
    }
    // Cleanup function to cancel debounce on unmount
    return () => {
      checkEmailAvailability.cancel();
    };
  }, [values.email, touched.email]);

  // Function to check if the current step's fields are valid
  const isStepValid = () => {
    const requiredFields = ['firstName', 'lastName', 'email', 'age', 'sex', 'weight', 'height'];
    return (
      requiredFields.every(
        (field) => touched[field] && !errors[field] && values[field] !== ''
      ) && emailAvailable === true
    );
  };

  return (
    <Box width="100%" maxWidth="600px" margin="0 auto">
      <Typography variant="h5" gutterBottom>
        Personal Information
      </Typography>

      <TextField
        label="First Name"
        name="firstName"
        value={values.firstName}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.firstName && Boolean(errors.firstName)}
        helperText={touched.firstName && errors.firstName}
        fullWidth
        margin="normal"
        required
      />

      <TextField
        label="Last Name"
        name="lastName"
        value={values.lastName}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.lastName && Boolean(errors.lastName)}
        helperText={touched.lastName && errors.lastName}
        fullWidth
        margin="normal"
        required
      />

      <TextField
        label="Email"
        name="email"
        type="email"
        value={values.email}
        onChange={(e) => {
          handleChange(e);
          setFieldTouched('email', true, false);
        }}
        onBlur={handleBlur}
        error={touched.email && Boolean(errors.email)}
        helperText={touched.email && errors.email}
        fullWidth
        margin="normal"
        required
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {checkingEmail ? null : emailAvailable === true ? (
                <CheckCircleIcon style={{ color: 'green' }} />
              ) : emailAvailable === false ? (
                <CancelIcon style={{ color: 'red' }} />
              ) : null}
            </InputAdornment>
          ),
        }}
      />

      <TextField
        label="Age"
        name="age"
        type="number"
        value={values.age}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.age && Boolean(errors.age)}
        helperText={touched.age && errors.age}
        fullWidth
        margin="normal"
        required
        InputProps={{ inputProps: { min: 1 } }}
      />

      {/* Sex Field */}
      <Box mt={2}>
        <FormControl
          fullWidth
          error={touched.sex && Boolean(errors.sex)}
        >
          <InputLabel id="sex-label">Sex</InputLabel>
          <Select
            labelId="sex-label"
            id="sex"
            name="sex"
            value={values.sex}
            onChange={handleChange}
            onBlur={handleBlur}
            label="Sex"
          >
            <MenuItem value="">
              <em>Select your sex</em>
            </MenuItem>
            <MenuItem value="Male">Male</MenuItem>
            <MenuItem value="Female">Female</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
            <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
          </Select>
          {touched.sex && errors.sex && (
            <FormHelperText>{errors.sex}</FormHelperText>
          )}
        </FormControl>
      </Box>

      <TextField
        label="Weight (kg)"
        name="weight"
        type="number"
        value={values.weight}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.weight && Boolean(errors.weight)}
        helperText={touched.weight && errors.weight}
        fullWidth
        margin="normal"
        required
        InputProps={{ inputProps: { min: 1 } }}
      />

      <TextField
        label="Height (cm)"
        name="height"
        type="number"
        value={values.height}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.height && Boolean(errors.height)}
        helperText={touched.height && errors.height}
        fullWidth
        margin="normal"
        required
        InputProps={{ inputProps: { min: 1 } }}
      />

      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="space-between" marginTop="20px">
        <Button variant="contained" color="secondary" onClick={prevStep}>
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={nextStep}
          disabled={!isStepValid()}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
}

PersonalInfo.propTypes = {
  nextStep: PropTypes.func.isRequired,
  prevStep: PropTypes.func.isRequired,
};

export default PersonalInfo;
