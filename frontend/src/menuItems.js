// src/menuItems.js

export const getMenuItems = (authToken) => {
    if (authToken) {
      // User is logged in
      return [
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/profile', label: 'Profile' },
        { path: '', label: 'Logout' }, // Removed path for logout since it's handled by click
      ];
    } else {
      // User is not logged in - return empty array since login/register are handled by nav buttons
      return [];
    }
  };