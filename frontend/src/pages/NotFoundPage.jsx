// frontend/src/pages/NotFoundPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
//import './NotFoundPage.css'; // Create and style as needed

function NotFoundPage() {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="80vh" textAlign="center">
      <Typography variant="h3" gutterBottom>
        404 - Page Not Found
      </Typography>
      <Typography variant="body1" gutterBottom>
        The page you're looking for does not exist.
      </Typography>
      <Button variant="contained" color="primary" component={Link} to="/">
        Go to Home
      </Button>
    </Box>
  );
}

export default NotFoundPage;
