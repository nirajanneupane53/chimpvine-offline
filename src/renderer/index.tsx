import { createRoot } from 'react-dom/client';
import App from './App';
import { Splash } from './components/splash';

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(<Splash />);

setTimeout(() => {
  root.render(<App />);
}, 2000);
// root.render(<App />);

// // calling IPC exposed from preload script
// window.electron.ipcRenderer.once('start-game', (arg) => {
//   // eslint-disable-next-line no-console
//   console.log(arg);
// });
// window.electron.ipcRenderer.sendMessage('start-game', ['ping']);
