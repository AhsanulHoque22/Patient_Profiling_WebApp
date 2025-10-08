import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  CalendarIcon, 
  UserGroupIcon, 
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ChartBarIcon,
  UserIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

interface DashboardStats {
  totalAppointments: number;
  todayAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  requestedAppointments: number;
  inProgressAppointments: number;
  totalPatients: number;
}

interface TodayAppointment {
  id: number;
  appointmentTime: string;
  status: string;
  serialNumber: number;
  patient: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  reason?: string;
}

const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch doctor profile to get doctor ID
  const { data: doctorProfile } = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: async () => {
      const response = await axios.get('/doctors/profile');
      return response.data.data.doctor;
    },
    enabled: user?.role === 'doctor',
  });

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['doctor-dashboard-stats', doctorProfile?.id],
    queryFn: async () => {
      const response = await axios.get(`/doctors/${doctorProfile?.id}/dashboard/stats`);
      return response.data.data.stats;
    },
    enabled: !!doctorProfile?.id,
  });

  // Fetch today's appointments for this doctor
  const { data: appointments } = useQuery<TodayAppointment[]>({
    queryKey: ['doctor-appointments-today', doctorProfile?.id],
    queryFn: async () => {
      if (!doctorProfile?.id) return [];
      
      // Fetch appointments for today for this specific doctor
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`/doctors/${doctorProfile.id}/appointments`, {
        params: { date: today }
      });
      
      const allAppointments = response.data.data.appointments || [];
      
      // Sort by appointment time
      return allAppointments.sort((a: any, b: any) => a.appointmentTime.localeCompare(b.appointmentTime));
    },
    enabled: user?.role === 'doctor' && !!doctorProfile?.id,
  });

  // Fetch doctor's ratings
  const { data: ratingData } = useQuery({
    queryKey: ['doctor-ratings', doctorProfile?.id],
    queryFn: async () => {
      const response = await axios.get(`/ratings/doctor/${doctorProfile?.id}`);
      return response.data.data;
    },
    enabled: !!doctorProfile?.id,
  });

  const getStatusColor = (status: string) => {
    const colors = {
      requested: 'border-yellow-500 bg-yellow-50',
      scheduled: 'border-blue-500 bg-blue-50',
      in_progress: 'border-purple-500 bg-purple-50',
      completed: 'border-green-500 bg-green-50',
      cancelled: 'border-red-500 bg-red-50',
    };
    return colors[status as keyof typeof colors] || 'border-gray-500 bg-gray-50';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      requested: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const statsCards = [
    {
      name: 'Today\'s Appointments',
      value: stats?.todayAppointments || 0,
      icon: CalendarIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Pending Requests',
      value: stats?.requestedAppointments || 0,
      icon: ExclamationCircleIcon,
      color: 'bg-yellow-500',
    },
    {
      name: 'In Progress',
      value: stats?.inProgressAppointments || 0,
      icon: ClockIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Completed Today',
      value: stats?.completedAppointments || 0,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Total Patients',
      value: stats?.totalPatients || 0,
      icon: UserGroupIcon,
      color: 'bg-indigo-500',
    },
    {
      name: 'Total Appointments',
      value: stats?.totalAppointments || 0,
      icon: ChartBarIcon,
      color: 'bg-primary-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Doctor's Dashboard</h1>
        <p className="text-gray-600">Welcome back, Dr. {user?.firstName} {user?.lastName}</p>
        {ratingData?.summary && ratingData.summary.totalRatings > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-gray-500">Your Overall Rating:</span>
            <div className="flex items-center gap-1">
              <StarIcon className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium text-gray-900">
                {parseFloat(ratingData.summary.averageRating).toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">
                ({ratingData.summary.totalRatings} reviews)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-3`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statsLoading ? '...' : stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Today's Schedule</h3>
            <button 
              onClick={() => navigate('/doctor-appointments')}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {!appointments || appointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No appointments scheduled for today</p>
              </div>
            ) : (
              appointments.slice(0, 5).map((appointment) => (
                <div 
                  key={appointment.id} 
                  className={`border-l-4 ${getStatusColor(appointment.status)} pl-4 py-3 rounded-r cursor-pointer hover:shadow-sm transition-shadow`}
                  onClick={() => navigate('/doctor-appointments')}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Serial #{appointment.serialNumber} - {appointment.appointmentTime}
                      </p>
                      <p className="text-sm text-gray-700">
                        {appointment.patient.user.firstName} {appointment.patient.user.lastName}
                      </p>
                      {appointment.reason && (
                        <p className="text-xs text-gray-500 mt-1">{appointment.reason}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(appointment.status)}`}>
                      {appointment.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/doctor-appointments')}
              className="w-full text-left px-4 py-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <span className="text-blue-700 font-medium block">Manage Appointments</span>
                  <span className="text-blue-600 text-xs">
                    {stats?.requestedAppointments || 0} pending requests
                  </span>
                </div>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/patients')}
              className="w-full text-left px-4 py-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center">
                <UserGroupIcon className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <span className="text-green-700 font-medium block">Patient History</span>
                  <span className="text-green-600 text-xs">
                    {stats?.totalPatients || 0} total patients
                  </span>
                </div>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/doctor-profile')}
              className="w-full text-left px-4 py-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center">
                <UserIcon className="h-5 w-5 text-purple-600 mr-3" />
                <span className="text-purple-700 font-medium">Update Profile</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Appointment Requests Summary */}
      {stats && stats.requestedAppointments > 0 && (
        <div className="card bg-yellow-50 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ExclamationCircleIcon className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-yellow-900">
                  {stats.requestedAppointments} Appointment Request{stats.requestedAppointments !== 1 ? 's' : ''} Pending
                </h3>
                <p className="text-sm text-yellow-700">
                  Review and approve appointment requests from patients
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/doctor-appointments')}
              className="btn-primary"
            >
              Review Requests
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;