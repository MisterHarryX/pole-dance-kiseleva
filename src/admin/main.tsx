import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import './admin.css';
import { AdminApp } from './App.tsx';

createRoot(document.getElementById('admin')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
