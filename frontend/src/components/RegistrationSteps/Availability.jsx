// src/components/RegistrationSteps/Availability.jsx

import React from 'react';
import { Field, ErrorMessage } from 'formik';
import { TextField, Slider, Typography, Button } from '@mui/material';

function Availability({ nextStep, prevStep }) {
  const marks = [
    { value: 15, label: '15 mins' },
    { value: 30, label: '30 mins' },
    { value: 45, label: '45 mins' },
    { value: 60, label: '1 hr' },
    { value: 90, label: '1.5 hrs' },
    { value: 120, label: '2+ hrs' },
  ];

  return (
    <div>
      <Typography id="workoutTime-slider" gutterBottom>
        Typical Workout Duration (minutes)
      </Typography>
      <Field name="workoutTime">
        {({ field, form }) => (
          <Slider
            {...field}
            aria-labelledby="workoutTime-slider"
            step={15}
            marks={marks}
            min={15}
            max={120}
            valueLabelDisplay="auto"
            value={field.value || 30}
            onChange={(_, value) => form.setFieldValue('workoutTime', value)}
          />
        )}
      </Field>
      <ErrorMessage name="workoutTime" component="div" style={{ color: 'red' }} />

      <Field
        name="workoutDays"
        as={TextField}
        label="Days Available per Week"
        type="number"
        inputProps={{ min: 1, max: 7 }}
        fullWidth
        margin="normal"
      />
      <ErrorMessage name="workoutDays" component="div" style={{ color: 'red' }} />

      <div style={{ marginTop: '20px' }}>
        <Button variant="contained" onClick={prevStep}>
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={nextStep}
          style={{ marginLeft: '10px' }}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default Availability;
