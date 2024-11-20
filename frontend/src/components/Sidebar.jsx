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
  FaBars,       // Hamburger icon
  FaChevronLeft // Left chevron icon
} from 'react-icons/fa'; // Import icons

function Sidebar({ isSidebarOpen, setIsSidebarOpen }) {
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
    <div className={`sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
      {/* Sidebar Header with Toggle Button */}
      <div className="sidebar-header">
        <button
          className="sidebar-toggle"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isSidebarOpen ? <FaChevronLeft /> : <FaBars />}
        </button>
      </div>

      <ul className="sidebar-menu">
        {menuItems.map((item) => (
          <li key={item.path} className="sidebar-item">
            <NavLink
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (window.innerWidth <= 768) {
                  setIsSidebarOpen(false); // Close sidebar on mobile after clicking a link
                }
              }}
            >
              <div className="icon">{iconMap[item.path]}</div>
              {isSidebarOpen && <span className="link-text">{item.label}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Sidebar;
