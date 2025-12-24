
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// @google/genai guidelines: Do not define process.env.
// The environment handles injecting the API_KEY automatically.

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
