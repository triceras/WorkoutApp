// src/components/RegistrationSteps/ReviewSubmit.jsx

import React from 'react';
import { Button } from '@mui/material';

function ReviewSubmit({ prevStep, values }) {
  const {
    username,
    name,
    age,
    weight,
    height,
    fitnessLevel,
    strengthGoals,
    additionalGoals,
    equipment,
    workoutTime,
    workoutDays,
  } = values;

  return (
    <div>
      <h2>Review Your Information</h2>
      <ul>
        <li><strong>Username:</strong> {username}</li>
        <li><strong>Name:</strong> {name}</li>
        <li><strong>Age:</strong> {age}</li>
        <li><strong>Weight:</strong> {weight} kg</li>
        <li><strong>Height:</strong> {height} cm</li>
        <li><strong>Fitness Level:</strong> {fitnessLevel}</li>
        <li><strong>Strength Goals:</strong> {strengthGoals.join(', ')}</li>
        <li><strong>Additional Goals:</strong> {additionalGoals}</li>
        <li><strong>Equipment:</strong> {equipment.join(', ')}</li>
        <li><strong>Workout Time:</strong> {workoutTime} minutes</li>
        <li><strong>Workout Days per Week:</strong> {workoutDays}</li>
      </ul>
      <div style={{ marginTop: '20px' }}>
        <Button variant="contained" onClick={prevStep}>
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          type="submit" // Submits the Formik form
          style={{ marginLeft: '10px' }}
        >
          Submit
        </Button>
      </div>
    </div>
  );
}

export default ReviewSubmit;