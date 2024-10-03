// src/components/RegistrationSteps/FitnessLevel.jsx

import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Button,
} from '@mui/material';
import PropTypes from 'prop-types';

function FitnessLevel({
  nextStep,
  prevStep,
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
}) {
  return (
    <div>
      <FormControl
        fullWidth
        margin="normal"
        error={touched.fitnessLevel && Boolean(errors.fitnessLevel)}
      >
        <InputLabel id="fitnessLevel-label">Fitness Level</InputLabel>
        <Select
          labelId="fitnessLevel-label"
          id="fitnessLevel"
          name="fitnessLevel"
          value={values.fitnessLevel}
          onChange={handleChange}
          onBlur={handleBlur}
          label="Fitness Level"
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          <MenuItem value="Beginner">Beginner</MenuItem>
          <MenuItem value="Intermediate">Intermediate</MenuItem>
          <MenuItem value="Advanced">Advanced</MenuItem>
        </Select>
        {touched.fitnessLevel && errors.fitnessLevel && (
          <FormHelperText>{errors.fitnessLevel}</FormHelperText>
        )}
      </FormControl>

      <div style={{ marginTop: '20px' }}>
        <Button
          variant="contained"
          onClick={prevStep}
          type="button" // Ensures it doesn't submit the form
        >
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={nextStep}
          style={{ marginLeft: '10px' }}
          type="button" // Ensures it doesn't submit the form
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// Define PropTypes for better type checking
FitnessLevel.propTypes = {
  nextStep: PropTypes.func.isRequired,
  prevStep: PropTypes.func.isRequired,
  values: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  touched: PropTypes.object.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleBlur: PropTypes.func.isRequired,
};

export default FitnessLevel;
