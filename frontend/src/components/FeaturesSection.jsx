// src/components/FeaturesSection.jsx

import React from 'react';
import { Grid, Typography, Container, Box } from '@mui/material';
import { FitnessCenter, Schedule, TrendingUp } from '@mui/icons-material';

function FeaturesSection() {
  const features = [
    {
      title: 'Personalized Plans',
      description: 'Get workout plans tailored to your fitness level and goals.',
      icon: <FitnessCenter fontSize="large" color="primary" />,
    },
    {
      title: 'Track Progress',
      description: 'Monitor your improvements over time with detailed analytics.',
      icon: <TrendingUp fontSize="large" color="primary" />,
    },
    {
      title: 'Flexible Scheduling',
      description: 'Fit workouts into your busy schedule with ease.',
      icon: <Schedule fontSize="large" color="primary" />,
    },
  ];

  return (
    <Box py={8} bgcolor="#f7f7f7">
      <Container>
        <Typography variant="h4" align="center" gutterBottom>
          Features
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Box textAlign="center">
                {feature.icon}
                <Typography variant="h6" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  {feature.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default FeaturesSection;
