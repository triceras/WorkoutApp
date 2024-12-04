// src/components/RegistrationSteps/FitnessLevel.jsx

import React from 'react';
import { useFormikContext } from 'formik';
import {
  Button,
  Box,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import PropTypes from 'prop-types';

function FitnessLevel() {
  const { values, errors, touched, setFieldValue } = useFormikContext();
  const fitnessLevelOptions = ['Beginner', 'Intermediate', 'Advanced'];

  return (
    <Box width="100%" maxWidth="600px" margin="0 auto">
      <FormControl
        component="fieldset"
        error={touched.fitnessLevel && Boolean(errors.fitnessLevel)}
      >
        <FormLabel component="legend">Select Your Fitness Level</FormLabel>
        <RadioGroup
          aria-label="fitnessLevel"
          name="fitnessLevel"
          value={values.fitnessLevel}
          onChange={(e) => setFieldValue('fitnessLevel', e.target.value)}
        >
          {fitnessLevelOptions.map((level) => (
            <FormControlLabel key={level} value={level} control={<Radio />} label={level} />
          ))}
        </RadioGroup>
        {touched.fitnessLevel && errors.fitnessLevel && (
          <Typography variant="body2" color="error">
            {errors.fitnessLevel}
          </Typography>
        )}
      </FormControl>
    </Box>
  );
}

FitnessLevel.propTypes = {};

export default FitnessLevel;
