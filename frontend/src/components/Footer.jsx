// src/components/Footer.jsx

import React from 'react';
import { Typography, Container, Box } from '@mui/material';

function Footer() {
  return (
    <Box bgcolor="#333" color="#fff" py={4}>
      <Container>
        <Typography variant="body1" align="center">
          &copy; {new Date().getFullYear()} MyFitnessApp. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}

export default Footer;
