// src/components/Navbar.jsx

import React, { useState, useContext, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';
import { useMediaQuery } from '@mui/material'; // Import from MUI
import { getMenuItems } from '../menuItems';

function Navbar({ isSidebarOpen, setIsSidebarOpen }) {
  const isMobile = useMediaQuery('(max-width:768px)'); // Use MUI's useMediaQuery
  const [isOpen, setIsOpen] = useState(false); // State to manage mobile menu
  const [isProfileOpen, setIsProfileOpen] = useState(false); // State to manage profile dropdown
  const { authToken } = useContext(AuthContext); // Access authToken from context
  const location = useLocation(); // Get current route
  const profileRef = useRef(null); // Ref for profile dropdown

  // Determine if Navbar should be hidden
  const hideNavbar = location.pathname === '/login' || location.pathname === '/register';

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Toggle profile dropdown
  const toggleProfileDropdown = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (hideNavbar) {
    return null; // Do not render Navbar on Login and Register pages
  }

  const menuItems = getMenuItems(authToken);

  return (
    <nav className="navbar" aria-label="Main Navigation">
      <div className="navbar-container">
        {/* Sidebar Toggle Button for Mobile */}
        {isMobile && (
          <button
            className="navbar-sidebar-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
        )}

        <div className="navbar-logo">
          <NavLink to="/" aria-label="MyFitnessApp Home">
            MyFitnessApp
          </NavLink>
        </div>

        <button
          className="navbar-hamburger"
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
        >
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </button>

        <ul className={`navbar-menu ${isOpen ? 'active' : ''}`}>
          {menuItems.map((item) => (
            <li className="navbar-item" key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  isActive ? 'navbar-link active-link' : 'navbar-link'
                }
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
