// src/components/FeaturesSection.jsx

import React from 'react';
import { Box, Typography, Grid, Container } from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import PersonIcon from '@mui/icons-material/Person';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';

function FeaturesSection() {
  const features = [
    {
      title: 'Customized Plans',
      description: 'Get workout plans tailored to your fitness level and goals.',
      icon: <FitnessCenterIcon fontSize="large" color="primary" />,
    },
    {
      title: 'Expert Guidance',
      description: 'Access advice and tips from professional trainers.',
      icon: <PersonIcon fontSize="large" color="primary" />,
    },
    {
      title: 'Track Your Progress',
      description: 'Monitor your improvements over time with detailed analytics.',
      icon: <TrackChangesIcon fontSize="large" color="primary" />,
    },
  ];

  return (
    <Box py={5}>
      <Container>
        <Typography variant="h4" component="h2" align="center" gutterBottom>
          Why Choose Us
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Box textAlign="center">
                {feature.icon}
                <Typography variant="h6" component="h3" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body1">{feature.description}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default FeaturesSection;
