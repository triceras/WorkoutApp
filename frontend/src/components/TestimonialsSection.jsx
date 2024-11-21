// src/components/TestimonialsSection.jsx
import React from 'react';
import { Typography, Container, Box, Paper } from '@mui/material';
import Carousel from 'react-material-ui-carousel';

function TestimonialsSection() {
  const testimonials = [
    {
      quote: "This app transformed my fitness journey. The personalized plans are exactly what I needed!",
      name: 'John Doe',
    },
    {
      quote: "I've seen amazing results in just a few weeks. Highly recommend!",
      name: 'Jane Smith',
    },
  ];

  return (
    <Box py={8} sx={{ backgroundColor: '#f5f5f5' }}>
      <Container maxWidth="md">
        <Typography variant="h4" align="center" gutterBottom>
          What Our Users Say
        </Typography>
        <Carousel
          animation="slide"
          indicators={true}
          navButtonsAlwaysVisible={true}
          interval={6000}
          sx={{ minHeight: '200px' }}
        >
          {testimonials.map((testimonial, index) => (
            <Paper 
              key={index}
              elevation={3}
              sx={{
                p: 4,
                m: 2,
                borderRadius: 2,
                backgroundColor: 'white'
              }}
            >
              <Box textAlign="center">
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ fontStyle: 'italic' }}
                >
                  "{testimonial.quote}"
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  color="primary"
                  sx={{ mt: 2 }}
                >
                  - {testimonial.name}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Carousel>
      </Container>
    </Box>
  );
}

export default TestimonialsSection;
