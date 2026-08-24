import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { AdminRoutes } from './routes/adminRoutes';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AdminRoutes />
    </AuthProvider>
  );
};

export default App;
