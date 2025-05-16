// Standard import of React and associated CSS styling.
import React from 'react';
import '../css/BottomNavBar.css';

/* scrollToTop is always shown as the "↑" button.

onBack is conditionally rendered as the "←" button based on whether the onBack prop is passed.
 */

const BottomNavBar = ({ onBack, scrollToTop }) => {
  return (
    <div className="bottom-nav">
      {/* Top button (always visible) */}
      <button onClick={scrollToTop}>↑</button>
      
      {/* Back button (visible only when not at root) */}
      {onBack && (
        <button onClick={onBack}>←</button>
      )}
    </div>
  );
};


// Allows BottomNavBar to be imported elsewhere in the app.
export default BottomNavBar;
