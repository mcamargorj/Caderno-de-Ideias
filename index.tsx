
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Garante que o objeto process.env exista no navegador para evitar erros de referência
// e permitir que a API_KEY configurada no Vercel seja acessada.
(window as any).process = (window as any).process || { env: {} };

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
