// src/components/Footer.jsx

import React from 'react';
import { Box, Typography, Container, Grid, Link } from '@mui/material';

function Footer() {
  return (
    <Box py={4} bgcolor="#333" color="#fff">
      <Container>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Company
            </Typography>
            <Link href="/about" color="inherit" underline="none">
              About Us
            </Link>
            <br />
            <Link href="/contact" color="inherit" underline="none">
              Contact
            </Link>
            <br />
            <Link href="/careers" color="inherit" underline="none">
              Careers
            </Link>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Legal
            </Typography>
            <Link href="/terms" color="inherit" underline="none">
              Terms of Service
            </Link>
            <br />
            <Link href="/privacy" color="inherit" underline="none">
              Privacy Policy
            </Link>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Follow Us
            </Typography>
            <Link href="#" color="inherit" underline="none">
              Facebook
            </Link>
            <br />
            <Link href="#" color="inherit" underline="none">
              Instagram
            </Link>
            <br />
            <Link href="#" color="inherit" underline="none">
              Twitter
            </Link>
          </Grid>
        </Grid>
        <Box textAlign="center" mt={4}>
          <Typography variant="body2">
            &copy; {new Date().getFullYear()} Your Company Name. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default Footer;
