// src/components/RegistrationSteps/FitnessLevel.jsx

import React from 'react';
import { useFormikContext } from 'formik';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SportsGymnasticsIcon from '@mui/icons-material/SportsGymnastics';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import PropTypes from 'prop-types';

const fitnessLevels = [
  {
    level: 'Beginner',
    icon: DirectionsRunIcon,
    description: 'New to fitness or returning after a long break. Focus on form and building basic strength.',
  },
  {
    level: 'Intermediate',
    icon: SportsGymnasticsIcon,
    description: 'Regular workout routine, comfortable with most exercises, looking to improve.',
  },
  {
    level: 'Advanced',
    icon: FitnessCenterIcon,
    description: 'Experienced in fitness, seeking challenging workouts and specific goals.',
  },
];

const FitnessLevelCard = ({ level, icon: Icon, description, selected, onClick }) => {
  const theme = useTheme();
  
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        height: '100%',
        transition: 'all 0.3s ease',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
        border: selected ? `2px solid ${theme.palette.success.main}` : 'none',
        backgroundColor: selected ? alpha('#4caf50', 0.1) : 'white',
        boxShadow: selected 
          ? `0 8px 24px ${alpha(theme.palette.success.main, 0.25)}`
          : '0 4px 12px rgba(0,0,0,0.1)',
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.25)}`,
          backgroundColor: selected ? alpha('#4caf50', 0.1) : alpha('#4caf50', 0.05),
        },
      }}
    >
      <CardContent>
        <Stack spacing={2} alignItems="center">
          <Icon sx={{ 
            fontSize: 48,
            color: selected ? theme.palette.success.main : theme.palette.text.secondary 
          }} />
          <Typography variant="h6" gutterBottom>
            {level}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            {description}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

function FitnessLevel() {
  const { values, errors, touched, setFieldValue } = useFormikContext();
  const theme = useTheme();

  return (
    <Box width="100%" maxWidth="900px" margin="0 auto">
      <Typography variant="h5" align="center" gutterBottom>
        Select Your Fitness Level
      </Typography>
      <Typography 
        variant="body1" 
        align="center" 
        color="text.secondary"
        sx={{ mb: 4 }}
      >
        Choose the level that best matches your current fitness experience
      </Typography>
      
      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
          mb: 4
        }}
      >
        {fitnessLevels.map((level) => (
          <FitnessLevelCard
            key={level.level}
            {...level}
            selected={values.fitnessLevel === level.level}
            onClick={() => setFieldValue('fitnessLevel', level.level)}
          />
        ))}
      </Box>

      {touched.fitnessLevel && errors.fitnessLevel && (
        <Typography variant="body2" color="error" align="center">
          {errors.fitnessLevel}
        </Typography>
      )}
    </Box>
  );
}

FitnessLevelCard.propTypes = {
  level: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  description: PropTypes.string.isRequired,
  selected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

FitnessLevel.propTypes = {};

export default FitnessLevel;
