// src/components/RegistrationSteps/FitnessLevel.jsx

import React from 'react';
import { FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Button, Box } from '@mui/material';
import { useFormikContext } from 'formik';
import PropTypes from 'prop-types';

function FitnessLevel({ nextStep, prevStep }) {
  const { values, errors, touched, handleChange, handleBlur } = useFormikContext();

  const fitnessLevelOptions = [
    'Beginner',
    'Intermediate',
    'Advanced',
  ];

  return (
    <Box width="100%" maxWidth="600px" margin="0 auto">
      <FormControl component="fieldset" margin="normal" fullWidth error={touched.fitnessLevel && Boolean(errors.fitnessLevel)}>
        <FormLabel component="legend">Select Your Fitness Level</FormLabel>
        <RadioGroup
          name="fitnessLevel"
          value={values.fitnessLevel}
          onChange={handleChange}
          onBlur={handleBlur}
        >
          {fitnessLevelOptions.map((level) => (
            <FormControlLabel
              key={level}
              value={level}
              control={<Radio />}
              label={level}
            />
          ))}
        </RadioGroup>
        {touched.fitnessLevel && errors.fitnessLevel && (
          <Box color="red" marginTop="5px">{errors.fitnessLevel}</Box>
        )}
      </FormControl>

      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="space-between" marginTop="20px">
        <Button variant="contained" color="secondary" onClick={prevStep}>
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={nextStep}
          disabled={values.fitnessLevel === '' || Boolean(errors.fitnessLevel)}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
}

FitnessLevel.propTypes = {
  nextStep: PropTypes.func.isRequired,
  prevStep: PropTypes.func.isRequired,
};

export default FitnessLevel;
