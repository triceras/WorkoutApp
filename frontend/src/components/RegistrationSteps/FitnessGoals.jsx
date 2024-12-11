// src/components/RegistrationSteps/FitnessGoals.jsx

import React from 'react';
import { useFormikContext } from 'formik';
import {
  Button,
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
  TextField,
  Tooltip,
  useTheme,
} from '@mui/material';
import PropTypes from 'prop-types';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SelectAllIcon from '@mui/icons-material/DoneAll';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Standard fitness goals options based on ACSM's Guidelines
const DEFAULT_STRENGTH_GOALS = [
  { id: 1, name: "Lose Weight" },
  { id: 2, name: "Rehabilitation" },
  { id: 3, name: "Improve Cardiovascular Health" },
  { id: 4, name: "Enhance Balance" },
  { id: 5, name: "Build Muscle Mass" },
  { id: 6, name: "Increase Strength" },
  { id: 7, name: "Improve Endurance" },
  { id: 8, name: "Enhance Flexibility" },
  { id: 9, name: "Improve Athletic Performance" },
  { id: 10, name: "Improve Mobility" },
  { id: 11, name: "Enhance Posture" },
  { id: 12, name: "Reduce Stress" },
  { id: 13, name: "Manage Body Composition" },
  { id: 14, name: "Boost Functional Movement" },
];

function FitnessGoals({ strengthGoalsOptions = DEFAULT_STRENGTH_GOALS }) {
  const theme = useTheme();
  const {
    values,
    errors,
    touched,
    setFieldValue,
  } = useFormikContext();

  // Custom blue colors
  const blueColors = {
    light: '#2196f3',  // Material-UI blue[500]
    main: '#1976d2',   // Material-UI blue[700]
    dark: '#0d47a1',   // Material-UI blue[900]
    bg: '#e3f2fd',     // Material-UI blue[50]
  };

  const handleGoalToggle = (id) => {
    if (values.strengthGoals.includes(id)) {
      setFieldValue(
        'strengthGoals',
        values.strengthGoals.filter((item) => item !== id)
      );
    } else {
      setFieldValue('strengthGoals', [...values.strengthGoals, id]);
    }
  };

  const handleSelectAll = () => {
    const allIds = strengthGoalsOptions.map((item) => item.id);
    setFieldValue('strengthGoals', allIds);
  };

  const handleClearAll = () => {
    setFieldValue('strengthGoals', []);
  };

  return (
    <Box 
      width="100%" 
      maxWidth="800px" 
      margin="0 auto"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Typography 
        variant="h5" 
        textAlign="center"
        sx={{ 
          mb: 1,
          fontWeight: 600,
          color: blueColors.main,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Fitness Goals
      </Typography>

      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center',
          gap: 2,
          mb: 2 
        }}
      >
        <Tooltip title="Select all goals">
          <Button
            variant="outlined"
            startIcon={<SelectAllIcon />}
            onClick={handleSelectAll}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              borderColor: blueColors.light,
              color: blueColors.main,
              '&:hover': {
                borderColor: blueColors.main,
                backgroundColor: blueColors.bg,
              },
            }}
          >
            Select All
          </Button>
        </Tooltip>
        <Tooltip title="Clear all selections">
          <Button
            variant="outlined"
            startIcon={<ClearAllIcon />}
            onClick={handleClearAll}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              borderColor: blueColors.light,
              color: blueColors.main,
              '&:hover': {
                borderColor: blueColors.main,
                backgroundColor: blueColors.bg,
              },
            }}
          >
            Clear All
          </Button>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Chip 
          icon={<FitnessCenterIcon sx={{ color: blueColors.main }} />}
          label={`Selected: ${values.strengthGoals.length} goals`}
          sx={{
            borderColor: blueColors.light,
            color: blueColors.main,
            '& .MuiChip-label': {
              color: blueColors.main,
            },
          }}
          variant="outlined"
        />
      </Box>

      {touched.strengthGoals && errors.strengthGoals && (
        <Typography 
          variant="body2" 
          color="error" 
          textAlign="center"
          sx={{ mb: 2 }}
        >
          {errors.strengthGoals}
        </Typography>
      )}

      {strengthGoalsOptions.length === 0 ? (
        <Typography textAlign="center" color="text.secondary">
          No fitness goals available.
        </Typography>
      ) : (
        <Grid container spacing={2} justifyContent="center">
          {strengthGoalsOptions.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Paper
                elevation={0}
                sx={{
                  p: 0.5,
                  border: 1,
                  borderColor: values.strengthGoals.includes(item.id) 
                    ? blueColors.light
                    : 'divider',
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  backgroundColor: values.strengthGoals.includes(item.id) 
                    ? blueColors.bg
                    : 'background.paper',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                    borderColor: values.strengthGoals.includes(item.id) 
                      ? blueColors.main
                      : blueColors.light,
                  },
                }}
                onClick={() => handleGoalToggle(item.id)}
              >
                <Button
                  fullWidth
                  sx={{
                    textTransform: 'none',
                    color: values.strengthGoals.includes(item.id) 
                      ? blueColors.main
                      : 'text.primary',
                    justifyContent: 'space-between',
                    py: 1.5,
                    '&:hover': {
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  <Typography variant="body1">
                    {item.name}
                  </Typography>
                  {values.strengthGoals.includes(item.id) && (
                    <CheckCircleIcon 
                      sx={{ 
                        ml: 1,
                        color: blueColors.main,
                      }} 
                    />
                  )}
                </Button>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Additional Goals TextField */}
      <Box sx={{ mt: 4 }}>
        <Typography 
          variant="h6" 
          gutterBottom
          sx={{ 
            color: blueColors.main,
            fontWeight: 500,
          }}
        >
          Additional Goals
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          name="additionalGoals"
          placeholder="Tell us about any other fitness goals you'd like to achieve..."
          value={values.additionalGoals}
          onChange={(e) => setFieldValue('additionalGoals', e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': {
                borderColor: blueColors.main,
              },
            },
          }}
        />
      </Box>
    </Box>
  );
}

FitnessGoals.propTypes = {
  strengthGoalsOptions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
};

export default FitnessGoals;
