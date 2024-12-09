import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
} from '@mui/material';
import {
  SelfImprovement, // For stretching/yoga
  LocalDrink, // For hydration
  Hotel, // For sleep
  DirectionsWalk, // For light walking
  Pool, // For swimming
  Spa, // For massage/recovery
} from '@mui/icons-material';

const suggestions = [
  {
    title: 'Light Stretching or Yoga',
    description: 'Gentle stretching helps maintain flexibility and aids recovery.',
    icon: <SelfImprovement />,
  },
  {
    title: 'Stay Hydrated',
    description: 'Drink plenty of water to help your muscles recover.',
    icon: <LocalDrink />,
  },
  {
    title: 'Get Quality Sleep',
    description: 'Aim for 7-9 hours of sleep to maximize recovery.',
    icon: <Hotel />,
  },
  {
    title: 'Light Walking',
    description: 'A 15-30 minute walk can promote blood flow without straining your muscles.',
    icon: <DirectionsWalk />,
  },
  {
    title: 'Light Swimming or Pool Activities',
    description: 'Low-impact activities in water can help with active recovery.',
    icon: <Pool />,
  },
  {
    title: 'Self-Massage or Foam Rolling',
    description: 'Target any tight muscles to reduce soreness and improve recovery.',
    icon: <Spa />,
  },
];

const RestDaySuggestions = () => {
  return (
    <Card sx={{ mt: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom color="primary">
          Rest Day Activities
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Rest days are crucial for muscle recovery and preventing burnout. Here are some suggested activities:
        </Typography>
        <List>
          {suggestions.map((suggestion, index) => (
            <ListItem key={index}>
              <ListItemIcon sx={{ color: 'primary.main' }}>
                {suggestion.icon}
              </ListItemIcon>
              <ListItemText
                primary={suggestion.title}
                secondary={suggestion.description}
                primaryTypographyProps={{ fontWeight: 'medium' }}
              />
            </ListItem>
          ))}
        </List>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Remember: Rest days are as important as workout days for achieving your fitness goals!
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RestDaySuggestions;
