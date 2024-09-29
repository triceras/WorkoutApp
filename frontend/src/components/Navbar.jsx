// src/components/Navbar.jsx

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css'; // Ensure this path is correct

function Navbar() {
  const [isOpen, setIsOpen] = useState(false); // State to manage mobile menu

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const getActiveClass = ({ isActive }) => (isActive ? 'navbar-link active-link' : 'navbar-link');

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
          <li className="navbar-item">
            <NavLink to="/dashboard" className={getActiveClass} onClick={() => setIsOpen(false)}>Dashboard</NavLink>
          </li>
          <li className="navbar-item">
            <NavLink to="/profile" className={getActiveClass} onClick={() => setIsOpen(false)}>Profile</NavLink>
          </li>
          <li className="navbar-item">
            <NavLink to="/logout" className={getActiveClass} onClick={() => setIsOpen(false)}>Logout</NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
