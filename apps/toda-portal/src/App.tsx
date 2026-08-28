import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { TodaRoutes } from './routes/todaRoutes';

export default function App() {
  return (
    <AuthProvider>
      <TodaRoutes />
    </AuthProvider>
  );
}
