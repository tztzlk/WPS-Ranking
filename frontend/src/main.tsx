import React from 'react';
import ReactDOM from 'react-dom/client';
import { PostHogProvider } from '@posthog/react';
import 'katex/dist/katex.min.css';
import App from './App.tsx';
import './index.css';
import { posthogEnabled, posthogOptions } from './lib/analytics';

const app = <App />;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {posthogEnabled ? (
      <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY!} options={posthogOptions}>
        {app}
      </PostHogProvider>
    ) : (
      app
    )}
  </React.StrictMode>,
);
