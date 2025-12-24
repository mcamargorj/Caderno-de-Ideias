
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Polyfill robusto para process.env no navegador.
// Isso garante que a aplicação não quebre e consiga acessar a API_KEY injetada pelo ambiente.
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
} else if (typeof (window as any).process.env === 'undefined') {
  (window as any).process.env = {};
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
