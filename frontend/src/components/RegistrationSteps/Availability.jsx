// src/components/RegistrationSteps/Availability.jsx

import React from 'react';
import { 
  Box, 
  Typography, 
  Slider, 
  FormHelperText, 
  Card,
  CardContent,
  Stack,
  useTheme,
  alpha,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { useFormikContext } from 'formik';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DateRangeIcon from '@mui/icons-material/DateRange';
import PropTypes from 'prop-types';

function Availability() {
  const { values, errors, touched, setFieldValue } = useFormikContext();
  const theme = useTheme();

  // Custom blue colors
  const blueColors = {
    light: '#2196f3',  // Material-UI blue[500]
    main: '#1976d2',   // Material-UI blue[700]
    dark: '#0d47a1',   // Material-UI blue[900]
  };

  const marks = [
    { value: 15, label: '15 mins' },
    { value: 30, label: '30 mins' },
    { value: 45, label: '45 mins' },
    { value: 60, label: '1 hr' },
    { value: 90, label: '1.5 hrs' },
    { value: 120, label: '2+ hrs' },
  ];

  const daysOptions = [1, 2, 3, 4, 5, 6, 7];

  return (
    <Box width="100%" maxWidth="900px" margin="0 auto">
      <Typography variant="h5" align="center" gutterBottom>
        Set Your Workout Schedule
      </Typography>
      <Typography 
        variant="body1" 
        align="center" 
        color="text.secondary"
        sx={{ mb: 4 }}
      >
        Tell us about your availability to help create your perfect workout plan
      </Typography>

      <Stack spacing={4} sx={{ mb: 4 }}>
        {/* Workout Duration Card */}
        <Card
          sx={{
            p: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            borderLeft: `4px solid ${blueColors.main}`,
            '&:hover': {
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              transform: 'translateY(-4px)',
            },
          }}
        >
          <CardContent>
            <Stack spacing={3}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AccessTimeIcon 
                  sx={{ 
                    fontSize: 28,
                    transition: 'transform 0.3s ease',
                    transform: values.workoutTime ? 'scale(1.1)' : 'scale(1)',
                    color: blueColors.main
                  }} 
                />
                <Typography variant="h6">
                  Typical Workout Duration
                </Typography>
              </Stack>

              <Box px={2}>
                <Slider
                  aria-labelledby="workoutTime-slider"
                  step={15}
                  marks={marks}
                  min={15}
                  max={120}
                  valueLabelDisplay="auto"
                  value={values.workoutTime}
                  onChange={(_, value) => setFieldValue('workoutTime', value)}
                  sx={{
                    color: blueColors.main,
                    '& .MuiSlider-thumb': {
                      height: 28,
                      width: 28,
                      backgroundColor: '#fff',
                      border: `2px solid ${blueColors.main}`,
                      transition: 'all 0.2s ease',
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: `0 0 0 8px ${alpha(blueColors.main, 0.16)}`,
                        transform: 'scale(1.2)',
                      },
                      '&.Mui-active': {
                        transform: 'scale(1.4)',
                      }
                    },
                    '& .MuiSlider-track': {
                      height: 6,
                      border: 'none',
                      backgroundImage: `linear-gradient(90deg, ${blueColors.light}, ${blueColors.main}, ${blueColors.dark})`,
                    },
                    '& .MuiSlider-rail': {
                      height: 6,
                      opacity: 0.5,
                      backgroundColor: '#e0e0e0',
                      borderRadius: 3,
                    },
                    '& .MuiSlider-valueLabel': {
                      backgroundColor: blueColors.main,
                      fontSize: '0.875rem',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      '&:before': {
                        borderBottom: `6px solid ${blueColors.main}`,
                      },
                    },
                    '& .MuiSlider-markLabel': {
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#666',
                      transition: 'all 0.2s ease',
                      '&.MuiSlider-markLabelActive': {
                        color: blueColors.main,
                        transform: 'scale(1.1)',
                      },
                    },
                  }}
                />
                {touched.workoutTime && errors.workoutTime && (
                  <FormHelperText error sx={{ textAlign: 'center', mt: 1 }}>
                    {errors.workoutTime}
                  </FormHelperText>
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Days per Week Card */}
        <Card
          sx={{
            p: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            borderLeft: `4px solid ${blueColors.main}`,
            '&:hover': {
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              transform: 'translateY(-4px)',
            },
          }}
        >
          <CardContent>
            <Stack spacing={3}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <DateRangeIcon 
                  sx={{ 
                    fontSize: 28,
                    transition: 'transform 0.3s ease',
                    transform: values.workoutDays ? 'scale(1.1)' : 'scale(1)',
                    color: blueColors.main
                  }}
                />
                <Typography variant="h6">
                  Days Available per Week
                </Typography>
              </Stack>

              <Box>
                <ToggleButtonGroup
                  value={values.workoutDays}
                  exclusive
                  onChange={(_, value) => {
                    if (value !== null) {
                      setFieldValue('workoutDays', value);
                    }
                  }}
                  aria-label="days per week"
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    justifyContent: 'center',
                    '& .MuiToggleButton-root': {
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      border: `2px solid ${alpha(blueColors.main, 0.5)}`,
                      color: blueColors.main,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: alpha(blueColors.main, 0.08),
                        borderColor: blueColors.main,
                      },
                      '&.Mui-selected': {
                        backgroundColor: blueColors.main,
                        color: '#fff',
                        '&:hover': {
                          backgroundColor: blueColors.dark,
                        },
                      },
                    },
                  }}
                >
                  {daysOptions.map((day) => (
                    <ToggleButton
                      key={day}
                      value={day}
                      aria-label={`${day} days`}
                    >
                      {day}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                {touched.workoutDays && errors.workoutDays && (
                  <FormHelperText error sx={{ textAlign: 'center', mt: 1 }}>
                    {errors.workoutDays}
                  </FormHelperText>
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}

Availability.propTypes = {};

export default Availability;
