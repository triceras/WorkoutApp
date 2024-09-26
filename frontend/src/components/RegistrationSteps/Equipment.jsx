// src/components/RegistrationSteps/Equipment.jsx

import React from 'react';
import { Field, ErrorMessage } from 'formik';
import {
  FormControlLabel,
  Checkbox,
  FormGroup,
  FormControl,
  FormLabel,
  Button,
} from '@mui/material';

function Equipment({ nextStep, prevStep }) {
  const equipmentOptions = [
    'Dumbbells',
    'Barbell',
    'Kettlebells',
    'Resistance Bands',
    'Bench',
    'Pull-up Bar',
    'Machines',
    'No Equipment',
  ];

  return (
    <div>
      <FormControl component="fieldset" margin="normal">
        <FormLabel component="legend">Available Equipment</FormLabel>
        <FormGroup>
          {equipmentOptions.map((item) => (
            <FormControlLabel
              key={item}
              control={
                <Field
                  as={Checkbox}
                  name="equipment"
                  type="checkbox"
                  value={item}
                />
              }
              label={item}
            />
          ))}
        </FormGroup>
        <ErrorMessage name="equipment" component="div" style={{ color: 'red' }} />
      </FormControl>

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

export default Equipment;
