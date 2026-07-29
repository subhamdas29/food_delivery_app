import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { ensureAuthToken } from './api/client';

export const App: React.FC = () => {
  useEffect(() => {
    // Auto-fetch dev token on initial app load if not present
    ensureAuthToken().catch((err) => {
      console.warn('Dev token auto-fetch failed on startup:', err);
    });
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/orders/:orderId" element={<OrderTrackingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
