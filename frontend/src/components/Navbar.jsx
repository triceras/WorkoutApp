// src/components/Navbar.jsx

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom'; // Ensure react-router-dom is installed
import './Navbar.css'; // Import the CSS file for styling

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <NavLink to="/">MyFitnessApp</NavLink>
        </div>
        <div className="navbar-hamburger" onClick={toggleMenu}>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
        <ul className={`navbar-menu ${isOpen ? 'active' : ''}`}>
          <li className="navbar-item">
            <NavLink to="/dashboard" className="navbar-link" activeClassName="active-link">Dashboard</NavLink>
          </li>
          <li className="navbar-item">
            <NavLink to="/profile" className="navbar-link" activeClassName="active-link">Profile</NavLink>
          </li>
          <li className="navbar-item">
          <NavLink to="/logout" className="navbar-link">Logout</NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
