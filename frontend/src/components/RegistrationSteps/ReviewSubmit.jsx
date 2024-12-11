// src/components/RegistrationSteps/ReviewSubmit.jsx

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  useTheme,
  alpha,
  Grid,
  Chip,
} from '@mui/material';
import PropTypes from 'prop-types';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DateRangeIcon from '@mui/icons-material/DateRange';
import FlagIcon from '@mui/icons-material/Flag';
import BuildIcon from '@mui/icons-material/Build';

function ReviewSubmit({
  values,
  isSubmitting,
  equipmentOptions,
  strengthGoalsOptions,
}) {
  const theme = useTheme();
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

  // Custom blue colors
  const blueColors = {
    light: '#2196f3',  // Material-UI blue[500]
    main: '#1976d2',   // Material-UI blue[700]
    dark: '#0d47a1',   // Material-UI blue[900]
    bg: '#e3f2fd',     // Material-UI blue[50]
  };

  // Helper function to map IDs to names
  const getNamesByIds = (ids, options) => {
    return options
      .filter((option) => ids.includes(option.id))
      .map((option) => option.name);
  };

  const InfoSection = ({ title, icon: Icon, children }) => (
    <Card
      elevation={0}
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
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Icon sx={{ color: blueColors.main, fontSize: 28 }} />
            <Typography variant="h6" color={blueColors.main}>
              {title}
            </Typography>
          </Stack>
          {children}
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box
      width="100%"
      maxWidth="900px"
      margin="0 auto"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Typography
        variant="h4"
        textAlign="center"
        sx={{
          mb: 4,
          fontWeight: 'bold',
          color: blueColors.main,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Review Your Information
      </Typography>

      <Stack spacing={3}>
        {/* Personal Information */}
        <InfoSection title="Personal Information" icon={PersonIcon}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Username
              </Typography>
              <Typography variant="body1">{username}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Full Name
              </Typography>
              <Typography variant="body1">{`${firstName} ${lastName}`}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Age
              </Typography>
              <Typography variant="body1">{age}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Sex
              </Typography>
              <Typography variant="body1">{sex}</Typography>
            </Grid>
          </Grid>
        </InfoSection>

        {/* Contact Information */}
        <InfoSection title="Contact Information" icon={EmailIcon}>
          <Typography variant="subtitle2" color="text.secondary">
            Email
          </Typography>
          <Typography variant="body1">{email}</Typography>
        </InfoSection>

        {/* Fitness Profile */}
        <InfoSection title="Fitness Profile" icon={FitnessCenterIcon}>
          <Typography variant="subtitle2" color="text.secondary">
            Fitness Level
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {fitnessLevel}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">
            Workout Schedule
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Chip
              icon={<AccessTimeIcon />}
              label={`${workoutTime} minutes per session`}
              sx={{
                backgroundColor: blueColors.bg,
                color: blueColors.main,
                '& .MuiChip-icon': { color: blueColors.main },
              }}
            />
            <Chip
              icon={<DateRangeIcon />}
              label={`${workoutDays} days per week`}
              sx={{
                backgroundColor: blueColors.bg,
                color: blueColors.main,
                '& .MuiChip-icon': { color: blueColors.main },
              }}
            />
          </Stack>
        </InfoSection>

        {/* Goals */}
        <InfoSection title="Fitness Goals" icon={FlagIcon}>
          <Stack spacing={2}>
            {strengthGoals.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Selected Goals
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {getNamesByIds(strengthGoals, strengthGoalsOptions).map((goal, index) => (
                    <Chip
                      key={index}
                      label={goal}
                      sx={{
                        backgroundColor: blueColors.bg,
                        color: blueColors.main,
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
            {additionalGoals && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Additional Goals
                </Typography>
                <Typography variant="body1">{additionalGoals}</Typography>
              </Box>
            )}
          </Stack>
        </InfoSection>

        {/* Equipment */}
        <InfoSection title="Available Equipment" icon={BuildIcon}>
          {equipment.length > 0 ? (
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {getNamesByIds(equipment, equipmentOptions).map((item, index) => (
                <Chip
                  key={index}
                  label={item}
                  sx={{
                    backgroundColor: blueColors.bg,
                    color: blueColors.main,
                  }}
                />
              ))}
            </Stack>
          ) : (
            <Typography variant="body1">No equipment selected</Typography>
          )}
        </InfoSection>
      </Stack>
    </Box>
  );
}

ReviewSubmit.propTypes = {
  values: PropTypes.object.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  equipmentOptions: PropTypes.array.isRequired,
  strengthGoalsOptions: PropTypes.array.isRequired,
};

export default ReviewSubmit;
