import '../public/vite.css';   // global CSS first
import './index.css';   // Tailwind (must be first)

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
