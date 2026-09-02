import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { applyTheme, storedTheme } from './lib/theme.js';
import './index.css';

// Before the first paint, so a light-theme user never sees a dark flash.
applyTheme(storedTheme());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => error?.status >= 500 && failureCount < 2,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--toast-bg)',
              color: 'var(--toast-ink)',
              border: '1px solid var(--toast-border)',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#22C55E', secondary: 'var(--toast-bg)' } },
            error: { iconTheme: { primary: '#EF4444', secondary: 'var(--toast-bg)' }, duration: 6000 },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
