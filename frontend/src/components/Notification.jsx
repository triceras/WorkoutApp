// ./frontend/src/components/Notification.jsx

import React from 'react';
import PropTypes from 'prop-types';
import './Notification.css';

function Notification({ message, type }) {
  return (
    <div className={`notification ${type}`}>
      {message}
    </div>
  );
}

Notification.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'info']).isRequired,
};

export default Notification;
