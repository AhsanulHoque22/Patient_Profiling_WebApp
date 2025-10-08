import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  UsersIcon, 
  UserGroupIcon, 
  CalendarIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface DoctorVerificationRequest {
  id: number;
  user?: {
    firstName: string;
    lastName: string;
  };
}

interface AnalyticsData {
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  dailyCounts: Record<string, number>;
  period: number;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  // Fetch system statistics
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await axios.get('/admin/stats');
      return response.data.data.stats;
    },
  });

  // Fetch recent activity (appointments analytics)
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const response = await axios.get('/admin/analytics/appointments?period=7');
      return response.data.data.analytics;
    },
  });

  // Fetch doctor verification requests
  const { data: verificationRequests } = useQuery<DoctorVerificationRequest[]>({
    queryKey: ['doctor-verifications'],
    queryFn: async () => {
      const response = await axios.get('/admin/doctor-verifications');
      return response.data.data.doctors;
    },
  });

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-header">Admin Dashboard</h1>
          <p className="text-gray-600">Manage the healthcare system and monitor system performance.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-header">Admin Dashboard</h1>
          <p className="text-gray-600">Manage the healthcare system and monitor system performance.</p>
        </div>
        <div className="card text-center py-8">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600">Failed to load dashboard data. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Admin Dashboard</h1>
        <p className="text-gray-600">Manage the healthcare system and monitor system performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Statistics Cards */}
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.totalUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Doctors</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.totalDoctors || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Appointments</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.totalAppointments || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Medical Records</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.totalMedicalRecords || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Overview */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center">
                <UsersIcon className="h-4 w-4 mr-2" />
                Total Patients
              </span>
              <span className="text-lg font-semibold text-gray-900">{stats?.totalPatients || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Active Users
              </span>
              <span className="text-lg font-semibold text-green-600">{stats?.activeUsers || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center">
                <ClockIcon className="h-4 w-4 mr-2" />
                Today's Appointments
              </span>
              <span className="text-lg font-semibold text-blue-600">{stats?.todayAppointments || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Completed Appointments
              </span>
              <span className="text-lg font-semibold text-green-600">{stats?.completedAppointments || 0}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.href = '/users'}
              className="w-full text-left px-4 py-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="text-blue-700 font-medium">Manage Users</span>
            </button>
            <button 
              onClick={() => window.location.href = '/admin-doctors'}
              className="w-full text-left px-4 py-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <span className="text-green-700 font-medium">Manage Doctors</span>
            </button>
            <button 
              onClick={() => window.location.href = '/admin-patients'}
              className="w-full text-left px-4 py-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <span className="text-purple-700 font-medium">Manage Patients</span>
            </button>
            <button 
              onClick={() => window.location.href = '/admin-ratings'}
              className="w-full text-left px-4 py-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <span className="text-yellow-700 font-medium">Manage Ratings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Appointment Analytics */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Appointment Analytics (Last 7 Days)</h3>
        {analyticsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : analytics ? (
          <div className="space-y-4">
            {/* Appointment Status */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">By Status</h4>
              <div className="space-y-2">
                {Object.entries(analytics.statusCounts || {}).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize flex items-center">
                      <div className={`h-2 w-2 rounded-full mr-2 ${
                        status === 'completed' ? 'bg-green-400' :
                        status === 'confirmed' ? 'bg-blue-400' :
                        status === 'cancelled' ? 'bg-red-400' :
                        'bg-yellow-400'
                      }`}></div>
                      {status.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Appointment Type */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">By Type</h4>
              <div className="space-y-2">
                {Object.entries(analytics.typeCounts || {}).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize flex items-center">
                      <div className={`h-2 w-2 rounded-full mr-2 ${
                        type === 'telemedicine' ? 'bg-green-400' :
                        type === 'in_person' ? 'bg-blue-400' :
                        'bg-purple-400'
                      }`}></div>
                      {type.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Doctor Verification Requests */}
            {verificationRequests && verificationRequests.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2 text-yellow-500" />
                  Pending Doctor Verifications
                </h4>
                <div className="space-y-2">
                  {verificationRequests.slice(0, 3).map((doctor: DoctorVerificationRequest) => (
                    <div key={doctor.id} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Dr. {doctor.user?.firstName} {doctor.user?.lastName}
                      </span>
                      <button 
                        onClick={() => window.location.href = '/admin-doctors'}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Review
                      </button>
                    </div>
                  ))}
                  {verificationRequests.length > 3 && (
                    <div className="text-xs text-gray-500 text-center pt-2">
                      +{verificationRequests.length - 3} more pending
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No recent activity data available.</p>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
