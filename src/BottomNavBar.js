import React from 'react';
import './BottomNavBar.css';

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

export default BottomNavBar;
