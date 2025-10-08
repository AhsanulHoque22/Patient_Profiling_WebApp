import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import DashboardMedicineTracker from '../components/DashboardMedicineTracker';
import MedicineMatrix from '../components/MedicineMatrix';
import {
  CalendarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalAppointments: number;
  todayAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  totalPatients?: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get patient profile for patients
  const { data: patientProfile } = useQuery({
    queryKey: ['patient-profile'],
    queryFn: async () => {
      const response = await axios.get('/patients/profile');
      return response.data.data.patient;
    },
    enabled: user?.role === 'patient',
  });

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await axios.get('/admin/stats', {
        params: { _t: Date.now() } // Cache-busting parameter
      });
      return response.data.data.stats;
    },
    enabled: user?.role === 'admin',
    staleTime: 0, // Data is immediately stale
    gcTime: 0, // Don't cache the data
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });

  const { data: patientStats, isLoading: patientLoading } = useQuery<DashboardStats>({
    queryKey: ['patient-dashboard-stats', user?.id],
    queryFn: async () => {
      try {
        // First get the patient profile to get the patient ID
        const patientResponse = await axios.get('/patients/profile');
        const patientId = patientResponse.data.data.patient.id;
        
        // Then get the dashboard stats using the patient ID
        const response = await axios.get(`/patients/${patientId}/dashboard/stats`, {
          params: { _t: Date.now() } // Cache-busting parameter
        });
        return response.data.data.stats;
      } catch (error) {
        console.error('Error fetching patient dashboard stats:', error);
        // Return default stats if API fails
        return {
          totalAppointments: 0,
          todayAppointments: 0,
          completedAppointments: 0,
          pendingAppointments: 0,
          requestedAppointments: 0,
          scheduledAppointments: 0
        };
      }
    },
    enabled: user?.role === 'patient' && !!user?.id,
    staleTime: 0, // Data is immediately stale
    gcTime: 0, // Don't cache the data
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2, // Retry failed requests
  });

  const { data: doctorStats, isLoading: doctorLoading } = useQuery<DashboardStats>({
    queryKey: ['doctor-dashboard-stats', user?.id],
    queryFn: async () => {
      // First get the doctor profile to get the doctor ID
      const doctorResponse = await axios.get('/doctors/profile');
      const doctorId = doctorResponse.data.data.doctor.id;
      
      // Then get the dashboard stats using the doctor ID
      const response = await axios.get(`/doctors/${doctorId}/dashboard/stats`, {
        params: { _t: Date.now() } // Cache-busting parameter
      });
      return response.data.data.stats;
    },
    enabled: user?.role === 'doctor' && !!user?.id,
    staleTime: 0, // Data is immediately stale
    gcTime: 0, // Don't cache the data
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Fetch recent appointments
  const { data: recentAppointments } = useQuery({
    queryKey: ['recent-appointments', user?.id],
    queryFn: async () => {
      if (user?.role === 'patient') {
        const patientResponse = await axios.get('/patients/profile');
        const patientId = patientResponse.data.data.patient.id;
        const response = await axios.get(`/patients/${patientId}/appointments`, {
          params: { limit: 5, sortBy: 'appointmentDate', sortOrder: 'DESC', _t: Date.now() }
        });
        return response.data.data.appointments;
      } else if (user?.role === 'doctor') {
        const doctorResponse = await axios.get('/doctors/profile');
        const doctorId = doctorResponse.data.data.doctor.id;
        const response = await axios.get(`/doctors/${doctorId}/appointments`, {
          params: { limit: 5, sortBy: 'appointmentDate', sortOrder: 'DESC', _t: Date.now() }
        });
        return response.data.data.appointments;
      } else if (user?.role === 'admin') {
        const response = await axios.get('/appointments', {
          params: { limit: 5, sortBy: 'appointmentDate', sortOrder: 'DESC', _t: Date.now() }
        });
        return response.data.data.appointments;
      }
      return [];
    },
    enabled: !!user?.id,
    staleTime: 0, // Data is immediately stale
    gcTime: 0, // Don't cache the data
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });

  const getStats = () => {
    if (user?.role === 'admin') return stats;
    if (user?.role === 'doctor') return doctorStats;
    if (user?.role === 'patient') return patientStats;
    return null;
  };

  const getLoading = () => {
    if (user?.role === 'admin') return isLoading;
    if (user?.role === 'doctor') return doctorLoading;
    if (user?.role === 'patient') return patientLoading;
    return false;
  };

  const currentStats = getStats();
  const loading = getLoading();

  const statsCards = [
    {
      name: 'Total Appointments',
      value: currentStats?.totalAppointments || 0,
      icon: CalendarIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Today\'s Appointments',
      value: currentStats?.todayAppointments || 0,
      icon: CalendarIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Completed Appointments',
      value: currentStats?.completedAppointments || 0,
      icon: ChartBarIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Pending Appointments',
      value: currentStats?.pendingAppointments || 0,
      icon: DocumentTextIcon,
      color: 'bg-yellow-500',
    },
  ];

  if (user?.role === 'admin' || user?.role === 'doctor') {
    statsCards.push({
      name: 'Total Patients',
      value: currentStats?.totalPatients || 0,
      icon: UserGroupIcon,
      color: 'bg-indigo-500',
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your healthcare account today.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${stat.color} p-3 rounded-md`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Appointments */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Appointments</h3>
          <div className="space-y-3">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))
            ) : recentAppointments && recentAppointments.length > 0 ? (
              recentAppointments.map((appointment: any) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {user?.role === 'patient' 
                        ? `Dr. ${appointment.doctor?.user?.firstName} ${appointment.doctor?.user?.lastName}`
                        : `${appointment.patient?.user?.firstName} ${appointment.patient?.user?.lastName}`
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.appointmentTime}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                    appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                    appointment.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {appointment.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No recent appointments found.</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {user?.role === 'patient' && (
              <>
                <button 
                  onClick={() => navigate('/appointments')}
                  className="w-full text-left px-4 py-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-primary-600 mr-3" />
                    <span className="text-primary-700 font-medium">Book Appointment</span>
                  </div>
                </button>
                <button 
                  onClick={() => navigate('/medical-records')}
                  className="w-full text-left px-4 py-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-green-700 font-medium">View Medical Records</span>
                  </div>
                </button>
                <button 
                  onClick={() => navigate('/doctors')}
                  className="w-full text-left px-4 py-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center">
                    <UserGroupIcon className="h-5 w-5 text-purple-600 mr-3" />
                    <span className="text-purple-700 font-medium">Find Doctors</span>
                  </div>
                </button>
              </>
            )}
            {user?.role === 'doctor' && (
              <>
                <button 
                  onClick={() => navigate('/doctor-appointments')}
                  className="w-full text-left px-4 py-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-primary-600 mr-3" />
                    <span className="text-primary-700 font-medium">Manage Appointments</span>
                  </div>
                </button>
                <button 
                  onClick={() => navigate('/patients')}
                  className="w-full text-left px-4 py-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center">
                    <UserGroupIcon className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-green-700 font-medium">Patient History</span>
                  </div>
                </button>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <button 
                  onClick={() => navigate('/users')}
                  className="w-full text-left px-4 py-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <div className="flex items-center">
                    <UserGroupIcon className="h-5 w-5 text-primary-600 mr-3" />
                    <span className="text-primary-700 font-medium">Manage Users</span>
                  </div>
                </button>
                <button 
                  onClick={() => navigate('/appointments')}
                  className="w-full text-left px-4 py-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-green-700 font-medium">All Appointments</span>
                  </div>
                </button>
                <button 
                  onClick={() => navigate('/admin-lab-reports')}
                  className="w-full text-left px-4 py-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center">
                    <ChartBarIcon className="h-5 w-5 text-purple-600 mr-3" />
                    <span className="text-purple-700 font-medium">Lab Reports & Analytics</span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Medicine Tracker for Patients */}
      {user?.role === 'patient' && patientProfile?.id && (
        <MedicineMatrix patientId={patientProfile.id} />
      )}
    </div>
  );
};

export default Dashboard;
