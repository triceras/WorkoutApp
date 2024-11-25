// src/components/Sidebar.jsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getMenuItems } from '../menuItems';
import './Sidebar.css';
import {
  FaHome,
  FaUser,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserPlus,
} from 'react-icons/fa'; // Removed FaBars and FaChevronLeft

function Sidebar() {
  const { authToken } = React.useContext(AuthContext);
  const menuItems = getMenuItems(authToken);

  // Map paths to icons based on authentication state
  const iconMap = authToken
    ? {
        '/dashboard': <FaHome />,
        '/profile': <FaUser />,
        '/logout': <FaSignOutAlt />,
      }
    : {
        '/login': <FaSignInAlt />,
        '/register': <FaUserPlus />,
      };

  return (
    <div className="sidebar static">
      {/* Removed Sidebar Header and Toggle Button */}

      <ul className="sidebar-menu">
        {menuItems.map((item) => (
          <li key={item.path} className="sidebar-item">
            <NavLink
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <div className="icon">{iconMap[item.path]}</div>
              <span className="link-text">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Sidebar;
