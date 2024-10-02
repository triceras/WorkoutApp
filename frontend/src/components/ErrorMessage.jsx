// frontend/src/components/ErrorMessage.jsx

import React from 'react';
import { Typography, Box } from '@mui/material';
import PropTypes from 'prop-types';

function ErrorMessage({ message }) {
  return (
    <Box my={2}>
      <Typography variant="body1" color="error">
        {message}
      </Typography>
    </Box>
  );
}

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired,
};

export default ErrorMessage;
