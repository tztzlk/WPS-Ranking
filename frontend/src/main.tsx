import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import { initI18n } from './i18n';
import './index.css';

// The language's texts load before the first render, so the page never shows English first.
initI18n().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
      {/* Vercel Web Analytics: page views without cookies. */}
      <Analytics />
    </React.StrictMode>,
  );
});
