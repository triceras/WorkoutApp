// src/components/TestimonialsSection.jsx

import React from 'react';
import { Box, Typography, Grid, Container, Avatar } from '@mui/material';

function TestimonialsSection() {
  const testimonials = [
    {
      name: 'John Doe',
      feedback:
        'This workout plan has completely transformed my fitness journey. Highly recommended!',
      avatar: 'https://i.pravatar.cc/150?img=3', // Placeholder image
    },
    {
      name: 'Jane Smith',
      feedback:
        'I love how personalized the plans are. It fits perfectly with my schedule.',
      avatar: 'https://i.pravatar.cc/150?img=5', // Placeholder image
    },
    // Add more testimonials as needed
  ];

  return (
    <Box py={5} bgcolor="#f9f9f9">
      <Container>
        <Typography variant="h4" component="h2" align="center" gutterBottom>
          What Our Users Say
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          {testimonials.map((testimonial, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Box display="flex" alignItems="center">
                <Avatar src={testimonial.avatar} alt={testimonial.name} />
                <Box ml={2}>
                  <Typography variant="h6" component="h3">
                    {testimonial.name}
                  </Typography>
                  <Typography variant="body1">{testimonial.feedback}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default TestimonialsSection;
