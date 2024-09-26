// src/components/RegistrationSteps/PersonalInfo.jsx

import React from 'react';
import { Field, ErrorMessage } from 'formik';
import { TextField, Button } from '@mui/material';

function PersonalInfo({ nextStep, prevStep }) {
  return (
    <div>
      <Field
        name="name"
        as={TextField}
        label="Name"
        fullWidth
        margin="normal"
        required
      />
      <ErrorMessage name="name" component="div" style={{ color: 'red' }} />

      <Field
        name="age"
        as={TextField}
        label="Age"
        type="number"
        fullWidth
        margin="normal"
        required
      />
      <ErrorMessage name="age" component="div" style={{ color: 'red' }} />

      <Field
        name="weight"
        as={TextField}
        label="Weight (kg)"
        type="number"
        fullWidth
        margin="normal"
        required
      />
      <ErrorMessage name="weight" component="div" style={{ color: 'red' }} />

      <Field
        name="height"
        as={TextField}
        label="Height (cm)"
        type="number"
        fullWidth
        margin="normal"
        required
      />
      <ErrorMessage name="height" component="div" style={{ color: 'red' }} />

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

export default PersonalInfo;
