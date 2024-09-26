// src/components/Navbar.jsx

import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav>
      {/* ... other links ... */}
      <Link to="/workout-plan">Workout Plan</Link>
    </nav>
  );
}

export default Navbar;
