// src/components/Navbar.jsx

import React, { useState, useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext'; // Import AuthContext
import './Navbar.css'; // Ensure this path is correct

function Navbar() {
  const [isOpen, setIsOpen] = useState(false); // State to manage mobile menu
  const { authToken } = useContext(AuthContext); // Access authToken from context
  const location = useLocation(); // Get current route

  // Determine if Navbar should be hidden
  const hideNavbar = location.pathname === '/login' || location.pathname === '/register';

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

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
                  to="/"
                  className={({ isActive }) =>
                    isActive ? 'navbar-link active-link no-underline' : 'navbar-link'
                  }
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </NavLink>
              </li>
              <li className="navbar-item">
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    isActive ? 'navbar-link active-link' : 'navbar-link'
                  }
                  onClick={() => setIsOpen(false)}
                >
                  Profile
                </NavLink>
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
