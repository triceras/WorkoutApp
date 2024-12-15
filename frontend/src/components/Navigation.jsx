import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
} from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';

const Navigation = () => {
  return (
    <AppBar position="static" sx={{ marginBottom: 3 }}>
      <Toolbar>
        <FitnessCenterIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Workout Tracker
        </Typography>
        <Box>
          <Button
            color="inherit"
            component={RouterLink}
            to="/"
          >
            View Log
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/log"
          >
            Log Workout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
