// src/components/WorkoutCard.jsx

import React from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText } from '@mui/material';

function WorkoutCard({ workout, userName }) {
  if (!workout) {
    return (
      <Typography variant="body1">
        You have no workout scheduled for today. Generate a new plan!
      </Typography>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{workout.title || "Today's Workout"}</Typography>
        <Typography variant="subtitle1" color="textSecondary">
          {new Date().toLocaleDateString()}
        </Typography>
        <List>
          {workout.exercises.map((exercise, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={exercise.name}
                secondary={`Sets: ${exercise.sets} Reps: ${exercise.reps}`}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}

export default WorkoutCard;
