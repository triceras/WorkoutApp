// src/components/RegistrationSteps/ReviewSubmit.jsx

import React from 'react';
import { Button, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';
import PropTypes from 'prop-types';

function ReviewSubmit({
  prevStep,
  values,
  isSubmitting,
  equipmentOptions,
  strengthGoalsOptions,
}) {
  const {
    username,
    firstName,
    lastName,
    email,
    age,
    sex,
    fitnessLevel,
    strengthGoals,
    additionalGoals,
    equipment,
    workoutTime,
    workoutDays,
  } = values;

  // Helper function to map IDs to names
  const getNamesByIds = (ids, options) => {
    return options
      .filter((option) => ids.includes(option.id))
      .map((option) => option.name)
      .join(', ');
  };

  return (
    <div>
      <Typography variant="h5" gutterBottom>
        Review Your Information
      </Typography>
      <List>
        <ListItem>
          <ListItemText primary="Username" secondary={username} />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText primary="First Name" secondary={firstName} />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText primary="Last Name" secondary={lastName} />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText primary="Email" secondary={email} />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText primary="Age" secondary={age} />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText primary="Sex" secondary={sex} />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText primary="Fitness Level" secondary={fitnessLevel} />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="Strength Goals"
            secondary={
              strengthGoals.length > 0
                ? getNamesByIds(strengthGoals, strengthGoalsOptions)
                : 'N/A'
            }
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="Available Equipment"
            secondary={
              equipment.length > 0
                ? getNamesByIds(equipment, equipmentOptions)
                : 'N/A'
            }
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="Additional Goals"
            secondary={additionalGoals || 'N/A'}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText primary="Workout Time (minutes)" secondary={workoutTime} />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText primary="Workout Days per Week" secondary={workoutDays} />
        </ListItem>
      </List>

      {/* Navigation Buttons */}
      <div
        style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}
      >
        <Button variant="contained" onClick={() => prevStep(values)} size="large">
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          type="submit" // Triggers Formik's handleSubmit
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </div>
    </div>
  );
}

// Define PropTypes for better type checking
ReviewSubmit.propTypes = {
  prevStep: PropTypes.func.isRequired,
  values: PropTypes.object.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  equipmentOptions: PropTypes.array.isRequired,
  strengthGoalsOptions: PropTypes.array.isRequired,
};

export default ReviewSubmit;
