// src/components/RegistrationSteps/FitnessGoals.jsx

import React from 'react';
import { Field, ErrorMessage } from 'formik';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
} from '@mui/material';

function FitnessGoals({ nextStep, prevStep }) {
  const fitnessLevels = ['Beginner', 'Intermediate', 'Advanced'];
  const goals = ['Build Muscle', 'Increase Strength', 'Improve Endurance', 'Lose Weight'];

  return (
    <div>
      <FormControl fullWidth margin="normal">
        <InputLabel id="fitnessLevel-label">Fitness Level</InputLabel>
        <Field
          name="fitnessLevel"
          as={Select}
          labelId="fitnessLevel-label"
          label="Fitness Level"
        >
          {fitnessLevels.map((level) => (
            <MenuItem key={level} value={level}>{level}</MenuItem>
          ))}
        </Field>
        <ErrorMessage name="fitnessLevel" component="div" style={{ color: 'red' }} />
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel id="strengthGoals-label">Strength Goals</InputLabel>
        <Field
          name="strengthGoals"
          as={Select}
          labelId="strengthGoals-label"
          label="Strength Goals"
          multiple
        >
          {goals.map((goal) => (
            <MenuItem key={goal} value={goal}>{goal}</MenuItem>
          ))}
        </Field>
        <ErrorMessage name="strengthGoals" component="div" style={{ color: 'red' }} />
      </FormControl>

      <Field
        name="additionalGoals"
        as={TextField}
        label="Additional Goals (optional)"
        multiline
        rows={4}
        fullWidth
        margin="normal"
      />
      <ErrorMessage name="additionalGoals" component="div" style={{ color: 'red' }} />

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

export default FitnessGoals;
