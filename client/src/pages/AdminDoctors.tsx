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
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  StarIcon,
  MapPinIcon,
  AcademicCapIcon,
  FunnelIcon,
  ArrowPathIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClockIcon,
  CheckBadgeIcon,
  XMarkIcon,
  EllipsisVerticalIcon,
  HeartIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { MEDICAL_DEPARTMENTS, getDepartmentLabel } from '../utils/departments';

interface Doctor {
  id: number;
  bmdcRegistrationNumber: string;
  department: string;
  experience: number;
  isVerified: boolean;
  bio: string;
  profileImage?: string;
  degrees: string[];
  hospital: string;
  location: string;
  consultationFee: number;
  calculatedRating?: number;
  totalRatings?: number;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    isActive: boolean;
    emailVerified: boolean;
    lastLogin: string;
  };
}

const AdminDoctors: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch doctors with pagination and filters
  const { data: doctorsData, isLoading, error } = useQuery({
    queryKey: ['admin-doctors', page, searchTerm, verificationFilter, departmentFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(verificationFilter && { isVerified: verificationFilter }),
        ...(departmentFilter && { department: departmentFilter }),
      });
      const response = await axios.get(`/admin/doctors?${params}`);
      return response.data.data;
    },
  });

  // Verify doctor mutation
  const verifyDoctorMutation = useMutation({
    mutationFn: async ({ doctorId, isVerified }: { doctorId: number; isVerified: boolean }) => {
      const response = await axios.put(`/admin/doctors/${doctorId}/verify`, { isVerified });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] });
      toast.success('Doctor verification status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update verification status');
    },
  });

  const handleVerificationToggle = (doctor: Doctor) => {
    verifyDoctorMutation.mutate({
      doctorId: doctor.id,
      isVerified: !doctor.isVerified,
    });
  };

  const handleViewDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setShowDoctorModal(true);
  };

  const getVerificationBadgeColor = (isVerified: boolean) => {
    return isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <HeartIcon className="h-8 w-8 text-blue-600 mr-3" />
              Doctor Management
            </h1>
            <p className="text-gray-600">Comprehensive doctor administration and verification management</p>
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
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Doctors</p>
              <p className="text-2xl font-bold text-gray-900">{doctorsData?.pagination?.totalRecords || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-gray-900">
                {doctorsData?.doctors?.filter((d: Doctor) => d.isVerified).length || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {doctorsData?.doctors?.filter((d: Doctor) => !d.isVerified).length || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Departments</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(doctorsData?.doctors?.map((d: Doctor) => d.department)).size || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search doctors by name, email, or BMDC number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <select 
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">All Status</option>
                <option value="true">Verified</option>
                <option value="false">Pending Verification</option>
              </select>
              <select 
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">All Departments</option>
                {MEDICAL_DEPARTMENTS.map((dept) => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-50 rounded-xl p-6">
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-gray-200 h-16 w-16"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="bg-red-50 rounded-xl p-6 max-w-md mx-auto">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-800 mb-2">Failed to Load Doctors</h3>
              <p className="text-red-600">Please try again later or contact support if the problem persists.</p>
            </div>
          </div>
        ) : !doctorsData?.doctors || doctorsData.doctors.length === 0 ? (
          <div className="p-8 text-center">
            <div className="bg-gray-50 rounded-xl p-8 max-w-md mx-auto">
              <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Doctors Found</h3>
              <p className="text-gray-600">Try adjusting your search criteria or check back later.</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Doctor Profile
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Department & Experience
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Verification Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Rating & Reviews
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {doctorsData.doctors.map((doctor: Doctor) => (
                    <tr key={doctor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-6 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {doctor.profileImage ? (
                              <img
                                src={`http://localhost:5000${doctor.profileImage}`}
                                alt={`Dr. ${doctor.user.firstName} ${doctor.user.lastName}`}
                                className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-100"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ring-2 ring-gray-100">
                                <span className="text-sm font-bold text-blue-700">
                                  {doctor.user.firstName.charAt(0)}{doctor.user.lastName.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">
                              Dr. {doctor.user.firstName} {doctor.user.lastName}
                            </div>
                            <div className="text-sm text-gray-600">{doctor.user.email}</div>
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <ShieldCheckIcon className="h-3 w-3 mr-1" />
                              BMDC: {doctor.bmdcRegistrationNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {getDepartmentLabel(doctor.department) || 'General Medicine'}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center mt-1">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {doctor.experience} years experience
                        </div>
                        {doctor.hospital && (
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                            {doctor.hospital}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getVerificationBadgeColor(doctor.isVerified)}`}>
                            {doctor.isVerified ? 'Verified' : 'Pending'}
                          </span>
                          {doctor.isVerified ? (
                            <CheckBadgeIcon className="h-5 w-5 text-green-500" title="Verified" />
                          ) : (
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" title="Pending Verification" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        {(doctor.calculatedRating || 0) > 0 ? (
                          <div className="flex items-center">
                            <div className="flex items-center">
                              <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                              <span className="text-sm font-semibold text-gray-900">
                                {doctor.calculatedRating?.toFixed(1)}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 ml-2">
                              ({doctor.totalRatings} reviews)
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No ratings yet</span>
                        )}
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button 
                            onClick={() => handleViewDoctor(doctor)}
                            className="inline-flex items-center px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View
                          </button>
                          <button 
                            onClick={() => handleVerificationToggle(doctor)}
                            className={`inline-flex items-center px-3 py-2 rounded-lg transition-colors ${
                              doctor.isVerified 
                                ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                                : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                            }`}
                            disabled={verifyDoctorMutation.isPending}
                          >
                            {doctor.isVerified ? (
                              <>
                                <XCircleIcon className="h-4 w-4 mr-1" />
                                Unverify
                              </>
                            ) : (
                              <>
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                Verify
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
              {doctorsData.doctors.map((doctor: Doctor) => (
                <div key={doctor.id} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      {doctor.profileImage ? (
                        <img
                          src={`http://localhost:5000${doctor.profileImage}`}
                          alt={`Dr. ${doctor.user.firstName} ${doctor.user.lastName}`}
                          className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-100"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ring-2 ring-gray-100">
                          <span className="text-lg font-bold text-blue-700">
                            {doctor.user.firstName.charAt(0)}{doctor.user.lastName.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Dr. {doctor.user.firstName} {doctor.user.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">{doctor.user.email}</p>
                        <p className="text-xs text-gray-500 flex items-center mt-1">
                          <ShieldCheckIcon className="h-3 w-3 mr-1" />
                          BMDC: {doctor.bmdcRegistrationNumber}
                        </p>
                      </div>
                    </div>
                    <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Department</p>
                      <p className="text-sm text-gray-900">{getDepartmentLabel(doctor.department) || 'General Medicine'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</p>
                      <p className="text-sm text-gray-900">{doctor.experience} years</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getVerificationBadgeColor(doctor.isVerified)}`}>
                        {doctor.isVerified ? 'Verified' : 'Pending'}
                      </span>
                      {doctor.isVerified ? (
                        <CheckBadgeIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    
                    {(doctor.calculatedRating || 0) > 0 && (
                      <div className="flex items-center">
                        <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                        <span className="text-sm font-semibold text-gray-900">
                          {doctor.calculatedRating?.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({doctor.totalRatings})
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => handleViewDoctor(doctor)}
                      className="flex-1 mr-2 inline-flex items-center justify-center px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      View Details
                    </button>
                    <button 
                      onClick={() => handleVerificationToggle(doctor)}
                      className={`flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                        doctor.isVerified 
                          ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                          : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                      }`}
                      disabled={verifyDoctorMutation.isPending}
                    >
                      {doctor.isVerified ? (
                        <>
                          <XCircleIcon className="h-4 w-4 mr-2" />
                          Unverify
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Verify
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {doctorsData.pagination && doctorsData.pagination.totalPages > 1 && (
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Showing page <span className="font-semibold text-gray-900">{doctorsData.pagination.currentPage}</span> of{' '}
                    <span className="font-semibold text-gray-900">{doctorsData.pagination.totalPages}</span> 
                    <span className="text-gray-500 ml-1">({doctorsData.pagination.totalRecords} total doctors)</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={!doctorsData.pagination.hasPrev}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="hidden sm:flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, doctorsData.pagination.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(doctorsData.pagination.totalPages - 4, doctorsData.pagination.currentPage - 2)) + i;
                        if (pageNum > doctorsData.pagination.totalPages) return null;
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              pageNum === doctorsData.pagination.currentPage
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={!doctorsData.pagination.hasNext}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Doctor Detail Modal */}
      {showDoctorModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {selectedDoctor.profileImage ? (
                    <img
                      src={`http://localhost:5000${selectedDoctor.profileImage}`}
                      alt={`Dr. ${selectedDoctor.user.firstName} ${selectedDoctor.user.lastName}`}
                      className="h-16 w-16 rounded-full object-cover ring-4 ring-white/20"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center ring-4 ring-white/20">
                      <span className="text-2xl font-bold text-white">
                        {selectedDoctor.user.firstName.charAt(0)}{selectedDoctor.user.lastName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Dr. {selectedDoctor.user.firstName} {selectedDoctor.user.lastName}
                    </h2>
                    <p className="text-blue-100">
                      {getDepartmentLabel(selectedDoctor.department) || 'General Medicine'}
                    </p>
                    <div className="flex items-center mt-2">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        selectedDoctor.isVerified 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedDoctor.isVerified ? 'Verified Doctor' : 'Pending Verification'}
                      </span>
                      {(selectedDoctor.calculatedRating || 0) > 0 && (
                        <div className="flex items-center ml-3 text-white">
                          <StarIcon className="h-4 w-4 text-yellow-300 mr-1" />
                          <span className="text-sm font-medium">
                            {selectedDoctor.calculatedRating?.toFixed(1)}
                            {selectedDoctor.totalRatings && selectedDoctor.totalRatings > 0 && (
                              <span className="text-blue-200 ml-1">({selectedDoctor.totalRatings} reviews)</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowDoctorModal(false)}
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
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                      Personal Information
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Email Address</label>
                        <p className="text-gray-900">{selectedDoctor.user.email}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Phone Number</label>
                        <p className="text-gray-900">{selectedDoctor.user.phone || 'Not provided'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">BMDC Registration</label>
                        <p className="text-gray-900 font-mono">{selectedDoctor.bmdcRegistrationNumber}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Experience</label>
                        <p className="text-gray-900">{selectedDoctor.experience} years</p>
                      </div>
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <BuildingOfficeIcon className="h-5 w-5 mr-2 text-blue-600" />
                      Professional Information
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Department</label>
                        <p className="text-gray-900">{getDepartmentLabel(selectedDoctor.department) || 'General Medicine'}</p>
                      </div>
                      {selectedDoctor.hospital && (
                        <div className="bg-white rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500 block mb-1">Hospital/Clinic</label>
                          <p className="text-gray-900">{selectedDoctor.hospital}</p>
                        </div>
                      )}
                      {selectedDoctor.location && (
                        <div className="bg-white rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500 block mb-1">Location</label>
                          <p className="text-gray-900 flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                            {selectedDoctor.location}
                          </p>
                        </div>
                      )}
                      {selectedDoctor.consultationFee && (
                        <div className="bg-white rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500 block mb-1">Consultation Fee</label>
                          <p className="text-gray-900">৳{selectedDoctor.consultationFee}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-6">
                  {/* Qualifications */}
                  {selectedDoctor.degrees && selectedDoctor.degrees.length > 0 && (
                    <div className="bg-green-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <AcademicCapIcon className="h-5 w-5 mr-2 text-green-600" />
                        Qualifications
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedDoctor.degrees.map((degree, index) => (
                          <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-lg text-sm font-medium">
                            {degree}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {selectedDoctor.bio && (
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">About Doctor</h3>
                      <p className="text-gray-700 leading-relaxed">{selectedDoctor.bio}</p>
                    </div>
                  )}

                  {/* Account Status */}
                  <div className="bg-purple-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <ShieldCheckIcon className="h-5 w-5 mr-2 text-purple-600" />
                      Account Status
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Account Status</label>
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${selectedDoctor.user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <p className={`text-sm font-semibold ${selectedDoctor.user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedDoctor.user.isActive ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Email Verified</label>
                        <div className="flex items-center">
                          {selectedDoctor.user.emailVerified ? (
                            <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <XMarkIcon className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          <p className={`text-sm font-semibold ${selectedDoctor.user.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedDoctor.user.emailVerified ? 'Verified' : 'Not Verified'}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Last Login</label>
                        <p className="text-gray-900 flex items-center">
                          <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {selectedDoctor.user.lastLogin ? new Date(selectedDoctor.user.lastLogin).toLocaleString() : 'Never'}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Member Since</label>
                        <p className="text-gray-900 flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {new Date(selectedDoctor.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowDoctorModal(false)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleVerificationToggle(selectedDoctor)}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedDoctor.isVerified 
                      ? 'text-red-700 bg-red-100 hover:bg-red-200' 
                      : 'text-green-700 bg-green-100 hover:bg-green-200'
                  }`}
                  disabled={verifyDoctorMutation.isPending}
                >
                  {selectedDoctor.isVerified ? 'Unverify Doctor' : 'Verify Doctor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDoctors;
