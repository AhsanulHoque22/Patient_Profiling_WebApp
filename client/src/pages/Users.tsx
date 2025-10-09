import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  MagnifyingGlassIcon, 
  UserGroupIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  EyeIcon,
  UserIcon,
  ShieldCheckIcon,
  ClockIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { getDepartmentLabel } from '../utils/departments';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'patient' | 'doctor' | 'admin';
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: string;
  createdAt: string;
  patientProfile?: any;
  doctorProfile?: any;
}

const Users: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch users with pagination and filters
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['admin-users', page, searchTerm, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter && { role: roleFilter }),
      });
      const response = await axios.get(`/admin/users?${params}`);
      return response.data.data;
    },
  });

  // Update user status mutation
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      const response = await axios.put(`/admin/users/${userId}/status`, { isActive });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update user status');
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await axios.delete(`/admin/users/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User deactivated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to deactivate user');
    },
  });

  const handleStatusToggle = (user: User) => {
    updateUserStatusMutation.mutate({
      userId: user.id,
      isActive: !user.isActive,
    });
  };

  const handleDeleteUser = (userId: number) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'doctor':
        return 'bg-green-100 text-green-800';
      case 'patient':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
      <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
              <p className="text-gray-600">Comprehensive user administration and permissions management</p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                <ArrowPathIcon className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{usersData?.pagination?.totalRecords || 0}</p>
              </div>
            </div>
      </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usersData?.users?.filter((user: User) => user.isActive).length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <UserIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Doctors</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usersData?.users?.filter((user: User) => user.role === 'doctor').length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-full">
                <ShieldCheckIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usersData?.users?.filter((user: User) => user.emailVerified).length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Filters and Search */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">User Directory</h3>
              </div>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full lg:w-auto">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                    placeholder="Search users by name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            >
              <option value="">All Roles</option>
              <option value="patient">Patients</option>
              <option value="doctor">Doctors</option>
                  <option value="admin">Administrators</option>
            </select>
              </div>
          </div>
        </div>
        
          {/* Content Area */}
          <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-6">
                    <div className="flex items-center space-x-4">
                      <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
              <div className="text-center py-12">
                <ExclamationTriangleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Users</h3>
                <p className="text-red-600">Unable to fetch user data. Please try again later.</p>
          </div>
        ) : !usersData?.users || usersData.users.length === 0 ? (
              <div className="text-center py-12">
                <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
                <p className="text-gray-500">No users match your current filters.</p>
          </div>
        ) : (
          <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          User Profile
                    </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Role & Status
                    </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Activity
                    </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {usersData.users.map((user: User) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-6 py-6">
                            <div className="flex items-center space-x-4">
                              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                                <span className="text-sm font-bold text-white">
                                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <span className="mr-2">{user.email}</span>
                                  {user.emailVerified ? (
                                    <CheckBadgeIcon className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <XMarkIcon className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-2">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                              <div>
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                  user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="text-sm text-gray-900">
                              <div className="flex items-center mb-1">
                                <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                                <span>Last Login</span>
                              </div>
                              <div className="text-gray-600 ml-6">
                                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                              </div>
                              <div className="flex items-center mt-2">
                                <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                                <span className="text-gray-600 text-xs">
                                  Joined {new Date(user.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => handleViewUser(user)}
                                className="flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <EyeIcon className="h-4 w-4 mr-1" />
                                View
                              </button>
                              <button 
                                onClick={() => handleStatusToggle(user)}
                                className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                                  user.isActive 
                                    ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                                    : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                }`}
                                disabled={updateUserStatusMutation.isPending}
                              >
                                {user.isActive ? (
                                  <>
                                    <XCircleIcon className="h-4 w-4 mr-1" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                    Activate
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {usersData.users.map((user: User) => (
                    <div key={user.id} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                            <span className="text-sm font-bold text-white">
                              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <span className="mr-2">{user.email}</span>
                              {user.emailVerified ? (
                                <CheckBadgeIcon className="h-4 w-4 text-green-500" />
                              ) : (
                                <XMarkIcon className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </div>
                        </div>
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                          <EllipsisVerticalIcon className="h-5 w-5" />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <div className="text-gray-500">Last Login</div>
                          <div className="text-gray-900">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Joined</div>
                          <div className="text-gray-900">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewUser(user)}
                          className="flex-1 flex items-center justify-center px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View Details
                        </button>
                        <button 
                          onClick={() => handleStatusToggle(user)}
                          className={`flex-1 flex items-center justify-center px-4 py-2 text-sm rounded-lg transition-colors ${
                            user.isActive 
                              ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                              : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                          }`}
                          disabled={updateUserStatusMutation.isPending}
                        >
                          {user.isActive ? (
                            <>
                              <XCircleIcon className="h-4 w-4 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Activate
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            </div>

            {/* Pagination */}
          {usersData?.pagination && usersData.pagination.totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                <div className="text-sm text-gray-700">
                  Showing page <span className="font-semibold text-gray-900">{usersData.pagination.currentPage}</span> of{' '}
                  <span className="font-semibold text-gray-900">{usersData.pagination.totalPages}</span> ({usersData.pagination.totalRecords} total users)
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={!usersData.pagination.hasPrev}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, usersData.pagination.totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            pageNum === usersData.pagination.currentPage
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!usersData.pagination.hasNext}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {selectedUser?.firstName.charAt(0)}{selectedUser?.lastName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {selectedUser?.firstName} {selectedUser?.lastName}
                    </h2>
                    <p className="text-blue-100 capitalize">{selectedUser?.role} Account</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Personal Information */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <UserIcon className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  </div>
                <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-500 block mb-1">Full Name</label>
                      <p className="text-gray-900 font-medium">{selectedUser?.firstName} {selectedUser?.lastName}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-500 block mb-1">Email Address</label>
                      <div className="flex items-center space-x-2">
                        <p className="text-gray-900 font-medium">{selectedUser?.email}</p>
                        {selectedUser?.emailVerified ? (
                          <CheckBadgeIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <XMarkIcon className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-500 block mb-1">Phone Number</label>
                      <p className="text-gray-900 font-medium">{selectedUser?.phone || 'Not provided'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-500 block mb-1">User Role</label>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getRoleBadgeColor(selectedUser?.role || '')}`}>
                        {selectedUser?.role?.charAt(0).toUpperCase() + selectedUser?.role?.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Account Status</h3>
                  </div>
                <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-500 block mb-1">Account Status</label>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                          selectedUser?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedUser?.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {selectedUser?.isActive ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-500 block mb-1">Email Verification</label>
                      <div className="flex items-center space-x-2">
                        {selectedUser?.emailVerified ? (
                          <>
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            <span className="text-green-600 font-medium">Verified</span>
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="h-5 w-5 text-red-500" />
                            <span className="text-red-600 font-medium">Not Verified</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-500 block mb-1">Last Login</label>
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-gray-900 font-medium">
                          {selectedUser?.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'}
                      </p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-500 block mb-1">Member Since</label>
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-gray-900 font-medium">{selectedUser?.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'Unknown'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role-specific Information */}
                {selectedUser?.role === 'doctor' && selectedUser?.doctorProfile && (
                  <div className="lg:col-span-2 bg-gray-50 rounded-xl p-6">
                    <div className="flex items-center space-x-2 mb-6">
                      <UserIcon className="h-5 w-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Doctor Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">BMDC Registration</label>
                        <p className="text-gray-900 font-medium">{selectedUser?.doctorProfile?.bmdcRegistrationNumber || 'Not provided'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Department</label>
                        <p className="text-gray-900 font-medium">{getDepartmentLabel(selectedUser?.doctorProfile?.department || '') || 'Not provided'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Experience</label>
                        <p className="text-gray-900 font-medium">{selectedUser?.doctorProfile?.experience || 0} years</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Verification Status</label>
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                          selectedUser?.doctorProfile?.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedUser?.doctorProfile?.isVerified ? 'Verified' : 'Pending Verification'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedUser?.role === 'patient' && selectedUser?.patientProfile && (
                  <div className="lg:col-span-2 bg-gray-50 rounded-xl p-6">
                    <div className="flex items-center space-x-2 mb-6">
                      <UserIcon className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Patient Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Blood Type</label>
                        <p className="text-gray-900 font-medium">{selectedUser?.patientProfile?.bloodType || 'Not provided'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Emergency Contact</label>
                        <p className="text-gray-900 font-medium">{selectedUser?.patientProfile?.emergencyContact || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => selectedUser && handleStatusToggle(selectedUser)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    selectedUser?.isActive 
                      ? 'text-red-700 bg-red-50 border border-red-200 hover:bg-red-100' 
                      : 'text-green-700 bg-green-50 border border-green-200 hover:bg-green-100'
                  }`}
                  disabled={updateUserStatusMutation.isPending}
                >
                  {selectedUser?.isActive ? 'Deactivate User' : 'Activate User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
