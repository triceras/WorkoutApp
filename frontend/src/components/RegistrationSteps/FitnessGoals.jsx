// src/components/RegistrationSteps/FitnessGoals.jsx

import React from 'react';
import { FormControlLabel, Checkbox, FormGroup, FormControl, FormLabel, Button } from '@mui/material';
import { Field, ErrorMessage } from 'formik';
import PropTypes from 'prop-types';

function FitnessGoals({
  nextStep,
  prevStep,
  values,
  handleChange,
  handleBlur,
  errors,
  touched,
}) {
  const strengthGoalOptions = [
    'Build Muscle Mass',
    'Increase Strength',
    'Improve Endurance',
    'Enhance Flexibility',
    'Lose Weight',
    'Tone Muscles',
    'Improve Athletic Performance',
    'Rehabilitation/Physical Therapy',
  ];

  return (
    <div>
      <FormControl component="fieldset" margin="normal" error={touched.strengthGoals && Boolean(errors.strengthGoals)}>
        <FormLabel component="legend">Select Your Strength Goals</FormLabel>
        <FormGroup>
          {strengthGoalOptions.map((goal) => (
            <FormControlLabel
              key={goal}
              control={
                <Checkbox
                  name="strengthGoals"
                  value={goal}
                  checked={values.strengthGoals.includes(goal)}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              }
              label={goal}
            />
          ))}
        </FormGroup>
        <ErrorMessage name="strengthGoals" component="div" style={{ color: 'red' }} />
      </FormControl>

      <Field
        name="additionalGoals"
        as={FormControl}
        fullWidth
        margin="normal"
      >
        {({ field, meta }) => (
          <>
            <FormLabel>Additional Goals (optional)</FormLabel>
            <textarea
              {...field}
              rows="4"
              style={{ width: '100%', padding: '8px', marginTop: '8px' }}
              placeholder="e.g., Incorporate Olympic lifts and kettlebell exercises."
            />
            {meta.touched && meta.error && (
              <div style={{ color: 'red', marginTop: '4px' }}>{meta.error}</div>
            )}
          </>
        )}
      </Field>

      <div style={{ marginTop: '20px' }}>
        <Button variant="contained" onClick={prevStep} type="button">
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={nextStep}
          style={{ marginLeft: '10px' }}
          type="button"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

FitnessGoals.propTypes = {
  nextStep: PropTypes.func.isRequired,
  prevStep: PropTypes.func.isRequired,
  values: PropTypes.object.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleBlur: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  touched: PropTypes.object.isRequired,
};

export default FitnessGoals;
