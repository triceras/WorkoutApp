// src/components/RegistrationSteps/Availability.jsx

import React from 'react';
import { Button, Box, Typography, TextField, Slider, FormHelperText } from '@mui/material';
import { useFormikContext } from 'formik';
import PropTypes from 'prop-types';

function Availability({ nextStep, prevStep }) {
  const { values, errors, touched, setFieldValue, handleBlur } = useFormikContext();

  const marks = [
    { value: 15, label: '15 mins' },
    { value: 30, label: '30 mins' },
    { value: 45, label: '45 mins' },
    { value: 60, label: '1 hr' },
    { value: 90, label: '1.5 hrs' },
    { value: 120, label: '2+ hrs' },
  ];

  return (
    <Box width="100%" maxWidth="600px" margin="0 auto">
      <Typography id="workoutTime-slider" gutterBottom>
        Typical Workout Duration (minutes)
      </Typography>
      <Slider
        aria-labelledby="workoutTime-slider"
        step={15}
        marks={marks}
        min={15}
        max={120}
        valueLabelDisplay="auto"
        value={values.workoutTime}
        onChange={(_, value) => setFieldValue('workoutTime', value)}
      />
      {touched.workoutTime && errors.workoutTime && (
        <FormHelperText error>{errors.workoutTime}</FormHelperText>
      )}

      <TextField
        label="Days Available per Week"
        name="workoutDays"
        type="number"
        value={values.workoutDays}
        onChange={(e) => setFieldValue('workoutDays', e.target.value)}
        onBlur={handleBlur}
        error={touched.workoutDays && Boolean(errors.workoutDays)}
        helperText={touched.workoutDays && errors.workoutDays}
        fullWidth
        margin="normal"
        required
        InputProps={{ inputProps: { min: 1, max: 7 } }}
      />

      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="space-between" marginTop="20px">
        <Button variant="contained" onClick={prevStep}>
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={nextStep}
          disabled={
            !values.workoutTime ||
            !values.workoutDays ||
            Boolean(errors.workoutTime) ||
            Boolean(errors.workoutDays)
          }
        >
          Next
        </Button>
      </Box>
    </Box>
  );
}

Availability.propTypes = {
  nextStep: PropTypes.func.isRequired,
  prevStep: PropTypes.func.isRequired,
};

export default Availability;
