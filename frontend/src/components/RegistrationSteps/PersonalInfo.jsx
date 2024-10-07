// src/components/RegistrationSteps/PersonalInfo.jsx

import React from 'react';
import { Button, Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import { useFormikContext } from 'formik';
import PropTypes from 'prop-types';

function PersonalInfo({ nextStep, prevStep }) {
  const { values, errors, touched, handleChange, handleBlur } = useFormikContext();

  // Function to check if the current step's fields are valid
  const isStepValid = () => {
    const requiredFields = ['firstName', 'lastName', 'email', 'age', 'weight', 'height'];
    return requiredFields.every(
      (field) => touched[field] && !errors[field] && values[field] !== ''
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
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.email && Boolean(errors.email)}
        helperText={touched.email && errors.email}
        fullWidth
        margin="normal"
        required
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
