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
    setIsOpen((prev) => !prev);
  };

  // Toggle profile dropdown
  // const toggleProfileDropdown = () => {
  //   setIsProfileOpen((prev) => !prev);
  // };

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

  // Close mobile menu when navigating to a different route
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

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
                onClick={() => setIsOpen(false)} // Close menu on link click
              >
                {item.label}
              </NavLink>
            </li>
          ))}

          {/* Example of Profile Dropdown (Uncomment and customize if needed) */}
          {/* 
          <li className="navbar-item navbar-dropdown" ref={profileRef}>
            <button
              className="dropdown-toggle"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={isProfileOpen}
            >
              Profile ▼
            </button>
            {isProfileOpen && (
              <ul className="dropdown-menu">
                <li>
                  <NavLink to="/profile" className="dropdown-item" onClick={() => setIsOpen(false)}>
                    View Profile
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/settings" className="dropdown-item" onClick={() => setIsOpen(false)}>
                    Settings
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/logout" className="dropdown-item" onClick={() => setIsOpen(false)}>
                    Logout
                  </NavLink>
                </li>
              </ul>
            )}
          </li>
          */}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
