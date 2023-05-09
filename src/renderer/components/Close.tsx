import React from 'react';
import { FiX } from 'react-icons/fi';

const Close = () => {
  const handleCloseWindow = () => {
    const sentData = {
      event: 'close',
    };
    window.electron.ipcRenderer.sendMessage('Screen-data', sentData);
  };
  return (
    <button onClick={() => handleCloseWindow()}>
      <FiX style={{ color: 'red' }} />
    </button>
  );
};

export default Close;
