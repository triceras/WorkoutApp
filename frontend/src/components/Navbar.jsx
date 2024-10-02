// src/components/Navbar.jsx

import React, { useState, useContext, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext'; // Import AuthContext
import './Navbar.css'; // Ensure this path is correct

function Navbar() {
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

  return (
    <nav className="navbar" aria-label="Main Navigation">
      <div className="navbar-container">
        <div className="navbar-logo">
          <NavLink to="/" aria-label="MyFitnessApp Home">MyFitnessApp</NavLink>
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
          {authToken && (
            <>
              <li className="navbar-item">
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    isActive ? 'navbar-link active-link no-underline' : 'navbar-link'
                  }
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </NavLink>
              </li>
              <li className="navbar-item navbar-dropdown" ref={profileRef}>
                <button
                  className="navbar-link dropdown-toggle"
                  onClick={toggleProfileDropdown}
                  aria-haspopup="true"
                  aria-expanded={isProfileOpen}
                >
                  Profile
                </button>
                {isProfileOpen && (
                  <ul className="dropdown-menu">
                    <li>
                      <NavLink
                        to="/profile"
                        className="dropdown-item"
                        onClick={() => {
                          setIsProfileOpen(false);
                          setIsOpen(false);
                        }}
                      >
                        View Profile
                      </NavLink>
                    </li>
                    {/* Uncomment the following if you have a Settings page */}
                    {/* <li>
                      <NavLink
                        to="/settings"
                        className="dropdown-item"
                        onClick={() => {
                          setIsProfileOpen(false);
                          setIsOpen(false);
                        }}
                      >
                        Settings
                      </NavLink>
                    </li> */}
                    {/* Add more dropdown items here if needed */}
                  </ul>
                )}
              </li>
              <li className="navbar-item">
                <NavLink
                  to="/logout"
                  className={({ isActive }) =>
                    isActive ? 'navbar-link active-link' : 'navbar-link'
                  }
                  onClick={() => setIsOpen(false)}
                >
                  Logout
                </NavLink>
              </li>
            </>
          )}
          {!authToken && (
            <>
              <li className="navbar-item">
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    isActive ? 'navbar-link active-link' : 'navbar-link'
                  }
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </NavLink>
              </li>
              <li className="navbar-item">
                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    isActive ? 'navbar-link active-link' : 'navbar-link'
                  }
                  onClick={() => setIsOpen(false)}
                >
                  Register
                </NavLink>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
