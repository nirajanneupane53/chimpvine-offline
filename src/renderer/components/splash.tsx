import React, { useEffect, useState } from 'react';
import logo from '../../../assets/images/logo.png';

export const Splash = () => {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Show the glowing effect seconds

    setShowSplash(true);
  }, []);

  const splashScreenStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: showSplash ? 1 : 0,
    transform: showSplash ? 'scale(1)' : 'scale(0.98)',
    transition: 'opacity 1s ease-in-out, transform 1s ease-in-out',
  };

  const logoStyle = {
    width: '800px' /* Adjust the size of the logo as needed */,
    transition: 'width 2s ease-in-out',
  };

  return (
    <div style={splashScreenStyle}>
      <img src={logo} alt="Logo" style={logoStyle} />
    </div>
  );
};
