import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { RouterProvider } from './router.jsx';
import { A11yProvider } from './context/A11yContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <A11yProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider>
            <App />
          </RouterProvider>
        </AuthProvider>
      </ToastProvider>
    </A11yProvider>
  </StrictMode>
);
