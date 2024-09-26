// src/components/RegistrationSteps/AccountDetailsForm.jsx

import React from 'react';
import { Field, ErrorMessage } from 'formik';
import { TextField, Button } from '@mui/material';

function AccountDetailsForm({ nextStep }) {
  return (
    <div>
      <h2>Create an Account</h2>
      <Field
        name="username"
        as={TextField}
        label="Username"
        fullWidth
        margin="normal"
        required
      />
      <ErrorMessage name="username" component="div" style={{ color: 'red' }} />

      <Field
        name="password"
        as={TextField}
        label="Password"
        type="password"
        fullWidth
        margin="normal"
        required
      />
      <ErrorMessage name="password" component="div" style={{ color: 'red' }} />

      <Field
        name="confirmPassword"
        as={TextField}
        label="Confirm Password"
        type="password"
        fullWidth
        margin="normal"
        required
      />
      <ErrorMessage
        name="confirmPassword"
        component="div"
        style={{ color: 'red' }}
      />

      <div style={{ marginTop: '20px' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={nextStep}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default AccountDetailsForm;
