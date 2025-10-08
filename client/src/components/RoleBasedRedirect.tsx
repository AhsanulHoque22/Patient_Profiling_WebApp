import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleBasedRedirect: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user role
  switch (user.role) {
    case 'patient':
      return <Navigate to="/dashboard" replace />;
    case 'doctor':
      return <Navigate to="/doctor-dashboard" replace />;
    case 'admin':
      return <Navigate to="/admin-dashboard" replace />;
    default:
      return <Navigate to="/dashboard" replace />;
  }
};

export default RoleBasedRedirect;
