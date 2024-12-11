// src/components/RegistrationSteps/Equipment.jsx

import React from 'react';
import { useFormikContext } from 'formik';
import {
  Button,
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
  Tooltip,
} from '@mui/material';
import PropTypes from 'prop-types';
import SelectAllIcon from '@mui/icons-material/DoneAll';
import ClearAllIcon from '@mui/icons-material/ClearAll';

// Equipment emoji mapping
const equipmentEmojis = {
  'Dumbbell': '🏋️',          // Weightlifting person emoji as a proxy for a dumbbell
  'Barbell': '🏋️‍♂️',        // Male weightlifter to distinguish from dumbbell
  'Kettlebell': '🏋️‍♀️',      // Female weightlifter to differentiate further
  'Treadmill': '🏃',          // Running person for treadmill
  'Elliptical Machine': '🚶', // Walking person for elliptical movement
  'Rowing Machine': '🚣',     // Rowing person
  'Stationary Bike': '🚴',    // Cycling person
  'Resistance Bands': '🪢',   // Knot emoji as a stand-in for resistance bands
  'Pull-Up Bar': '💪',        // Flexed biceps for upper body strength exercises
  'Yoga Mat': '🧘',           // Person in lotus position
  'Medicine Ball': '🔴',      // Red circle to represent a weighted ball
  'Jump Rope': '➰',           // Curly loop suggesting a rope
  'Battle Ropes': '🪢',       // Knot again, to symbolize ropes
  'Power Rack': '🏗️',         // Construction frame as a proxy for a rack
  'Bench Press': '📏',         // Ruler as a placeholder symbolizing a horizontal bench
  'Leg Press Machine': '🦵',   // Leg emoji
  'Smith Machine': '🏋️',       // Weightlifting to represent a bar path
  'Cable Machine': '🤸',       // Person cartwheeling as a proxy for versatile cable exercises
  'Foam Roller': '🌀',         // Spiral to represent rolling motion
  'Assault Bike': '🚴‍♂️',     // Male cyclist
  'Stability Ball': '⚪',       // White circle to represent a ball
  'No equipment': '❌',         // Cross mark
};

function Equipment({ equipmentOptions }) {
  const { values, errors, touched, setFieldValue } = useFormikContext();

  const handleEquipmentToggle = (id) => {
    if (values.equipment.includes(id)) {
      setFieldValue(
        'equipment',
        values.equipment.filter((item) => item !== id)
      );
    } else {
      setFieldValue('equipment', [...values.equipment, id]);
    }
  };

  const handleSelectAll = () => {
    const allIds = equipmentOptions.map((item) => item.id);
    setFieldValue('equipment', allIds);
  };

  const handleClearAll = () => {
    setFieldValue('equipment', []);
  };

  // Get emoji for equipment name
  const getEmoji = (name) => {
    return equipmentEmojis[name] || '🏋️';
  };

  return (
    <Box 
      width="100%" 
      maxWidth="800px" 
      margin="0 auto"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Typography 
        variant="h5" 
        textAlign="center"
        sx={{ 
          mb: 1,
          fontWeight: 600,
          color: 'primary.main',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Available Equipment
      </Typography>

      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center',
          gap: 2,
          mb: 2 
        }}
      >
        <Tooltip title="Select all equipment">
          <Button
            variant="outlined"
            startIcon={<SelectAllIcon />}
            onClick={handleSelectAll}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            Select All
          </Button>
        </Tooltip>
        <Tooltip title="Clear all selections">
          <Button
            variant="outlined"
            startIcon={<ClearAllIcon />}
            onClick={handleClearAll}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            Clear All
          </Button>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Chip 
          icon={<span style={{ fontSize: '1.2rem' }}>🏋️</span>}
          label={`Selected: ${values.equipment.length} items`}
          color="primary"
          variant="outlined"
        />
      </Box>

      {touched.equipment && errors.equipment && (
        <Typography 
          variant="body2" 
          color="error" 
          textAlign="center"
          sx={{ mb: 2 }}
        >
          {errors.equipment}
        </Typography>
      )}

      {equipmentOptions.length === 0 ? (
        <Typography textAlign="center" color="text.secondary">
          No equipment options available.
        </Typography>
      ) : (
        <Grid container spacing={2} justifyContent="center">
          {equipmentOptions.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Paper
                elevation={0}
                sx={{
                  p: 0.5,
                  border: 1,
                  borderColor: values.equipment.includes(item.id) 
                    ? 'primary.main' 
                    : 'divider',
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  backgroundColor: values.equipment.includes(item.id) 
                    ? 'primary.light' 
                    : 'background.paper',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                  },
                }}
                onClick={() => handleEquipmentToggle(item.id)}
              >
                <Button
                  fullWidth
                  sx={{
                    textTransform: 'none',
                    color: values.equipment.includes(item.id) 
                      ? 'primary.contrastText' 
                      : 'text.primary',
                    justifyContent: 'flex-start',
                    p: 1.5,
                    '& .emoji': {
                      fontSize: '1.5rem',
                      marginRight: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }
                  }}
                >
                  <span className="emoji">{getEmoji(item.name)}</span>
                  {item.name}
                </Button>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

Equipment.propTypes = {
  equipmentOptions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default Equipment;
