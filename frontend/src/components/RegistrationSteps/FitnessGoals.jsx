// src/components/RegistrationSteps/FitnessGoals.jsx

import React from 'react';
import { FormControlLabel, Checkbox, FormGroup, FormControl, FormLabel, Button, TextField, Box } from '@mui/material';
import { Field, ErrorMessage, useFormikContext } from 'formik';
import PropTypes from 'prop-types';

function FitnessGoals({ nextStep, prevStep, strengthGoalOptions }) {
  const { values, errors, touched,  handleChange, handleBlur, setFieldValue } = useFormikContext();

  const handleCheckboxChange = (event) => {
    const { value, checked } = event.target;
    const id = parseInt(value, 10);
    if (checked) {
      setFieldValue('strengthGoals', [...values.strengthGoals, id]);
    } else {
      setFieldValue('strengthGoals', values.strengthGoals.filter((item) => item !== id));
    }
  };

  return (
    <div>
      <FormControl
        component="fieldset"
        margin="normal"
        error={touched.strengthGoals && Boolean(errors.strengthGoals)}
      >
        <FormLabel component="legend">Select Your Strength Goals</FormLabel>
        <FormGroup>
          {strengthGoalOptions.length === 0 ? (
            <p>No strength goals available.</p>
          ) : (
            strengthGoalOptions.map((goal) => (
              <FormControlLabel
                key={goal.id}
                control={
                  <Checkbox
                    name="strengthGoals"
                    value={goal.id}
                    checked={values.strengthGoals.includes(goal.id)}
                    onChange={handleCheckboxChange}
                  />
                }
                label={goal.name}
              />
            ))
          )}
        </FormGroup>
        {touched.strengthGoals && errors.strengthGoals && (
          <div style={{ color: 'red', marginTop: '5px' }}>{errors.strengthGoals}</div>
        )}
        {/* Additional Goals TextField */}
        {/* Additional Goals Section */}
        <Box mt={3}>
          <FormLabel component="legend" sx={{ fontSize: '1.25rem', marginBottom: '10px' }}>
            Additional Goals (optional)
          </FormLabel>

          <Field
            as={TextField}
            name="additionalGoals"
            multiline
            rows={3}
            placeholder="e.g., Incorporate Olympic lifts and kettlebell exercises."
            value={values.additionalGoals}
            onChange={handleChange}
            onBlur={handleBlur}
            fullWidth
          />
          <ErrorMessage name="additionalGoals" component="div" style={{ color: 'red', marginTop: '4px' }} />
        </Box>
      </FormControl>

      {/* Navigation Buttons */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
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

FitnessGoals.propTypes = {
  nextStep: PropTypes.func.isRequired,
  prevStep: PropTypes.func.isRequired,
  strengthGoalOptions: PropTypes.array.isRequired,
};

export default FitnessGoals;
