import React from 'react';
import { useAuth } from '../context/AuthContext';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Admin Dashboard</h1>
        <p className="text-gray-600">Manage the healthcare system and monitor system performance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Overview */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Users</span>
              <span className="text-lg font-semibold text-gray-900">1,234</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Doctors</span>
              <span className="text-lg font-semibold text-gray-900">45</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Appointments</span>
              <span className="text-lg font-semibold text-gray-900">5,678</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending Verifications</span>
              <span className="text-lg font-semibold text-red-600">12</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <span className="text-blue-700 font-medium">Manage Users</span>
            </button>
            <button className="w-full text-left px-4 py-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <span className="text-green-700 font-medium">Verify Doctors</span>
            </button>
            <button className="w-full text-left px-4 py-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <span className="text-purple-700 font-medium">System Analytics</span>
            </button>
            <button className="w-full text-left px-4 py-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
              <span className="text-yellow-700 font-medium">Backup Database</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="h-2 w-2 bg-green-400 rounded-full"></div>
            <span className="text-sm text-gray-600">New user registration: Dr. Sarah Johnson</span>
            <span className="text-xs text-gray-400">2 hours ago</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
            <span className="text-sm text-gray-600">Appointment completed: John Doe with Dr. Smith</span>
            <span className="text-xs text-gray-400">4 hours ago</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
            <span className="text-sm text-gray-600">Doctor verification pending: Dr. Michael Brown</span>
            <span className="text-xs text-gray-400">6 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
