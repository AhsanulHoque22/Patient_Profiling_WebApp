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
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  HeartIcon
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
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      name: 'Today\'s Appointments',
      value: currentStats?.todayAppointments || 0,
      icon: ClockIcon,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      name: 'Completed Appointments',
      value: currentStats?.completedAppointments || 0,
      icon: CheckCircleIcon,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      name: 'Pending Appointments',
      value: currentStats?.pendingAppointments || 0,
      icon: ExclamationTriangleIcon,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ];

  if (user?.role === 'admin' || user?.role === 'doctor') {
    statsCards.push({
      name: 'Total Patients',
      value: currentStats?.totalPatients || 0,
      icon: UserGroupIcon,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="space-y-8 p-6">
        {/* Modern Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
      <div>
                <h1 className="text-4xl font-bold tracking-tight mb-2">
                  Welcome back, {user?.firstName}! 👋
        </h1>
                <p className="text-indigo-100 text-lg">
          Here's what's happening with your healthcare account today.
        </p>
      </div>
              <div className="hidden md:block">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center">
                    <UserGroupIcon className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${user?.role === 'patient' ? 'lg:grid-cols-4' : 'lg:grid-cols-5'}`}>
            {[...Array(user?.role === 'patient' ? 4 : 5)].map((_, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded-lg w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded-lg w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${statsCards.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-5'}`}>
            {statsCards.map((stat, index) => (
              <div 
                key={stat.name} 
                className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-white/50 flex flex-col"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="h-1 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${stat.color} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${Math.min((stat.value / Math.max(stat.value, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
          ))}
        </div>
      )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Appointments */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Recent Appointments</h3>
              <CalendarIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="space-y-4">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded-xl"></div>
                  </div>
                ))
              ) : recentAppointments && recentAppointments.length > 0 ? (
                recentAppointments.map((appointment: any, index: number) => (
                  <div 
                    key={appointment.id} 
                    className="group bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl p-4 hover:shadow-md transition-all duration-300 hover:scale-[1.02] border border-gray-200/50"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {user?.role === 'patient' 
                              ? `${appointment.doctor?.user?.firstName?.[0]}${appointment.doctor?.user?.lastName?.[0]}`
                              : `${appointment.patient?.user?.firstName?.[0]}${appointment.patient?.user?.lastName?.[0]}`
                            }
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {user?.role === 'patient' 
                              ? `Dr. ${appointment.doctor?.user?.firstName} ${appointment.doctor?.user?.lastName}`
                              : `${appointment.patient?.user?.firstName} ${appointment.patient?.user?.lastName}`
                            }
                          </p>
                          <p className="text-sm text-gray-600 flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.appointmentTime}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full shadow-sm ${
                        appointment.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        appointment.status === 'scheduled' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {appointment.status}
                      </span>
                    </div>
                </div>
              ))
            ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No recent appointments found.</p>
                </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">⚡</span>
              </div>
            </div>
            <div className="space-y-4">
            {user?.role === 'patient' && (
              <>
                <button 
                  onClick={() => navigate('/app/appointments')}
                    className="group w-full text-left p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 hover:scale-[1.02] border border-blue-200/50 hover:shadow-md"
                >
                  <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                        <CalendarIcon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-blue-800 font-semibold">Book Appointment</span>
                  </div>
                </button>
                <button 
                  onClick={() => navigate('/app/medical-records')}
                    className="group w-full text-left p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl hover:from-emerald-100 hover:to-green-100 transition-all duration-300 hover:scale-[1.02] border border-emerald-200/50 hover:shadow-md"
                >
                  <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                        <DocumentTextIcon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-emerald-800 font-semibold">View Medical Records</span>
                  </div>
                </button>
                <button 
                  onClick={() => navigate('/app/doctors')}
                    className="group w-full text-left p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl hover:from-purple-100 hover:to-violet-100 transition-all duration-300 hover:scale-[1.02] border border-purple-200/50 hover:shadow-md"
                >
                  <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                        <UserGroupIcon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-purple-800 font-semibold">Find Doctors</span>
                  </div>
                </button>
              </>
            )}
            {user?.role === 'doctor' && (
              <>
                <button 
                  onClick={() => navigate('/app/appointments')}
                    className="group w-full text-left p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 hover:scale-[1.02] border border-blue-200/50 hover:shadow-md"
                >
                  <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                        <CalendarIcon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-blue-800 font-semibold">Manage Appointments</span>
                  </div>
                </button>
                <button 
                  onClick={() => navigate('/app/admin-patients')}
                    className="group w-full text-left p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl hover:from-emerald-100 hover:to-green-100 transition-all duration-300 hover:scale-[1.02] border border-emerald-200/50 hover:shadow-md"
                >
                  <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                        <UserGroupIcon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-emerald-800 font-semibold">Patient History</span>
                  </div>
                </button>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <button 
                  onClick={() => navigate('/app/admin-users')}
                    className="group w-full text-left p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 hover:scale-[1.02] border border-blue-200/50 hover:shadow-md"
                >
                  <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                        <UserGroupIcon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-blue-800 font-semibold">Manage Users</span>
                  </div>
                </button>
                <button 
                  onClick={() => navigate('/app/appointments')}
                    className="group w-full text-left p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl hover:from-emerald-100 hover:to-green-100 transition-all duration-300 hover:scale-[1.02] border border-emerald-200/50 hover:shadow-md"
                >
                  <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                        <CalendarIcon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-emerald-800 font-semibold">All Appointments</span>
                  </div>
                </button>
                <button 
                    onClick={() => navigate('/app/admin-lab-tests')}
                    className="group w-full text-left p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl hover:from-purple-100 hover:to-violet-100 transition-all duration-300 hover:scale-[1.02] border border-purple-200/50 hover:shadow-md"
                >
                  <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                        <ChartBarIcon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-purple-800 font-semibold">Lab Reports & Analytics</span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Medicine Tracker for Patients */}
      {user?.role === 'patient' && patientProfile?.id && (
          <div className="mt-8">
        <MedicineMatrix patientId={patientProfile.id} />
          </div>
      )}
      </div>
    </div>
  );
};

export default Dashboard;
