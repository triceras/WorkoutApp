// src/pages/LandingPage.jsx

import React from 'react';
import { Button, Box, Typography, Container } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Link } from 'react-router-dom';
import HeroImage from '../assets/WorkoutPlanAi.png'; // Ensure you have an appropriate image
import FeaturesSection from '../components/FeaturesSection';
import TestimonialsSection from '../components/TestimonialsSection';
import Footer from '../components/Footer';

const useStyles = makeStyles((theme) => ({
  heroSection: {
    backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.1)), url(${HeroImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: '150px 0',
    color: '#fff',
    textAlign: 'center',
  },
  heroContent: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  ctaButton: {
    marginTop: '30px',
    padding: '15px 30px',
    fontSize: '1.2rem',
  },
}));

function LandingPage() {
  const classes = useStyles();

  return (
    <div>
      {/* Hero Section */}
      <Box className={classes.heroSection}>
        <Container>
          <Box className={classes.heroContent}>
            <Typography variant="h2" component="h1" gutterBottom>
              Achieve Your Fitness Goals Faster
            </Typography>
            <Typography variant="h5" component="p" gutterBottom>
              Personalized workout plans tailored to your needs. Start your transformation today.
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              className={classes.ctaButton}
              component={Link}
              to="/register"
            >
              Get Started
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <FeaturesSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default LandingPage;
