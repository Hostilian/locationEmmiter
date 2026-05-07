import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css'; // Make sure this exists or tailwind is loaded
import './i18n';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
