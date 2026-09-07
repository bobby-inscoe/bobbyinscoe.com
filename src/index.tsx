import React from 'react';
import { createRoot } from 'react-dom/client';
import '@mantine/core/styles.css';
import '@/shared/theme/fonts';
import '@/shared/theme/tokens.css';
import '@/shared/theme/reset.css';
import { App } from '@/app';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element was not found');
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
