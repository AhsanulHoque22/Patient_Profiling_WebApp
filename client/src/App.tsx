import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PatientProfile from './pages/PatientProfile';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorProfile from './pages/DoctorProfile';
import AdminDashboard from './pages/AdminDashboard';
import Appointments from './pages/Appointments';
import DoctorAppointments from './pages/DoctorAppointments';
import MedicalRecords from './pages/MedicalRecords';
import Users from './pages/Users';
import Doctors from './pages/Doctors';
import Patients from './pages/Patients';
import NotFound from './pages/NotFound';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<PatientProfile />} />
                <Route path="doctor-profile" element={<DoctorProfile />} />
                <Route path="doctor-dashboard" element={<DoctorDashboard />} />
                <Route path="admin-dashboard" element={<AdminDashboard />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="doctor-appointments" element={<DoctorAppointments />} />
                <Route path="medical-records" element={<MedicalRecords />} />
                <Route path="users" element={<Users />} />
                <Route path="doctors" element={<Doctors />} />
                <Route path="patients" element={<Patients />} />
              </Route>
              
              {/* 404 route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;