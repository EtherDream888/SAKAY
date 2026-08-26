import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AdminRoutes } from './routes/adminRoutes';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AdminRoutes />
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
