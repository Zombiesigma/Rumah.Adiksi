import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and prevent GetStream SDK WebSocket/WebRTC connection failures 
// from bubbling up as fatal app crashes in sandboxed iframe environments
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason) {
      const msg = reason.message || '';
      const isWS = reason.isWSFailure || 
                   /initial WS connection/i.test(msg) || 
                   /WebSocket/i.test(msg) || 
                   /connection could not be established/i.test(msg);
      if (isWS) {
        console.warn("Mencegah error GetStream WebSocket dari crash aplikasi:", reason);
        event.preventDefault();
        event.stopPropagation();
      }
    }
  });

  window.addEventListener('error', (event) => {
    const error = event.error;
    if (error) {
      const msg = error.message || '';
      const isWS = error.isWSFailure || 
                   /initial WS connection/i.test(msg) || 
                   /WebSocket/i.test(msg) || 
                   /connection could not be established/i.test(msg);
      if (isWS) {
        console.warn("Mencegah error GetStream WebSocket dari crash aplikasi:", error);
        event.preventDefault();
        event.stopPropagation();
      }
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
