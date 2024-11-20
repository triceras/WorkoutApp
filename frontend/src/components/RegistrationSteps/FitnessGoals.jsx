// src/components/RegistrationSteps/FitnessGoals.jsx

import React from 'react';
import { useFormikContext } from 'formik';
import {
  FormControlLabel,
  Checkbox,
  FormGroup,
  FormControl,
  FormLabel,
  Button,
  Box,
  Typography,
  TextField,
} from '@mui/material';
import PropTypes from 'prop-types';

function FitnessGoals({ nextStep, prevStep, strengthGoalsOptions }) {
  const {
    values,
    errors,
    touched,
    setFieldValue,
  } = useFormikContext();

  const handleCheckboxChange = (event) => {
    const { value, checked } = event.target;
    const id = parseInt(value, 10);
    if (checked) {
      setFieldValue('strengthGoals', [...values.strengthGoals, id]);
    } else {
      setFieldValue(
        'strengthGoals',
        values.strengthGoals.filter((item) => item !== id)
      );
    }
  };

  const isStepValid = () => {
    return (
      Array.isArray(values.strengthGoals) &&
      values.strengthGoals.length > 0 &&
      !errors.strengthGoals
    );
  };

  return (
    <Box width="100%" maxWidth="600px" margin="0 auto">
      <Typography variant="h5" gutterBottom>
        Fitness Goals
      </Typography>
      <FormControl
        component="fieldset"
        error={touched.strengthGoals && Boolean(errors.strengthGoals)}
      >
        <FormLabel component="legend">Select Your Strength Goals</FormLabel>
        <FormGroup>
          {strengthGoalsOptions.length === 0 ? (
            <Typography variant="body1">No strength goals available.</Typography>
          ) : (
            strengthGoalsOptions.map((item) => (
              <FormControlLabel
                key={item.id}
                control={
                  <Checkbox
                    name="strengthGoals"
                    value={item.id}
                    checked={values.strengthGoals.includes(item.id)}
                    onChange={handleCheckboxChange}
                  />
                }
                label={item.name}
              />
            ))
          )}
        </FormGroup>
        {touched.strengthGoals && errors.strengthGoals && (
          <Typography variant="body2" color="error">
            {errors.strengthGoals}
          </Typography>
        )}
      </FormControl>

      <TextField
        label="Additional Goals"
        name="additionalGoals"
        value={values.additionalGoals}
        onChange={(e) => setFieldValue('additionalGoals', e.target.value)}
        fullWidth
        margin="normal"
        multiline
        rows={4}
      />

      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="space-between" marginTop="20px">
        <Button variant="contained" onClick={() => prevStep()}>
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => nextStep()}
          disabled={!isStepValid()}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
}

FitnessGoals.propTypes = {
  nextStep: PropTypes.func.isRequired,
  prevStep: PropTypes.func.isRequired,
  strengthGoalsOptions: PropTypes.array.isRequired,
};

export default FitnessGoals;
