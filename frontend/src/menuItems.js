// src/menuItems.js

export const getMenuItems = (authToken) => {
    if (authToken) {
      // User is logged in
      return [
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/profile', label: 'Profile' },
        { path: '/logout', label: 'Logout' },
      ];
    } else {
      // User is not logged in
      return [
        { path: '/login', label: 'Login' },
        { path: '/register', label: 'Register' },
      ];
    }
  };
  