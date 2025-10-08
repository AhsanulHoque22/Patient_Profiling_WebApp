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
  AcademicCapIcon
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
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Doctor Management</h1>
        <p className="text-gray-600">Manage doctor profiles and verification status.</p>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h3 className="text-lg font-medium text-gray-900">All Doctors</h3>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search doctors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field w-full sm:w-64 pl-10"
              />
            </div>
            <select 
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="input-field w-full sm:w-auto"
            >
              <option value="">All Status</option>
              <option value="true">Verified</option>
              <option value="false">Pending Verification</option>
            </select>
            <select 
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input-field w-full sm:w-auto"
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
        
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4 p-4">
                <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">Failed to load doctors. Please try again later.</p>
          </div>
        ) : !doctorsData?.doctors || doctorsData.doctors.length === 0 ? (
          <div className="text-center py-8">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No doctors found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doctor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verification
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {doctorsData.doctors.map((doctor: Doctor) => (
                    <tr key={doctor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {doctor.profileImage ? (
                              <img
                                src={`http://localhost:5000${doctor.profileImage}`}
                                alt={`Dr. ${doctor.user.firstName} ${doctor.user.lastName}`}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {doctor.user.firstName.charAt(0)}{doctor.user.lastName.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              Dr. {doctor.user.firstName} {doctor.user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{doctor.user.email}</div>
                            <div className="text-xs text-gray-400">BMDC: {doctor.bmdcRegistrationNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getDepartmentLabel(doctor.department) || 'General Medicine'}
                        </div>
                        <div className="text-sm text-gray-500">{doctor.experience} years experience</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getVerificationBadgeColor(doctor.isVerified)}`}>
                            {doctor.isVerified ? 'Verified' : 'Pending'}
                          </span>
                          {doctor.isVerified ? (
                            <ShieldCheckIcon className="h-4 w-4 text-green-500" title="Verified" />
                          ) : (
                            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" title="Pending Verification" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(doctor.calculatedRating || 0) > 0 ? (
                          <div className="flex items-center">
                            <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                            <span className="text-sm text-gray-900">
                              {doctor.calculatedRating?.toFixed(1)}
                            </span>
                            <span className="text-xs text-gray-500 ml-1">
                              ({doctor.totalRatings} reviews)
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No ratings yet</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button 
                          onClick={() => handleViewDoctor(doctor)}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </button>
                        <button 
                          onClick={() => handleVerificationToggle(doctor)}
                          className={`inline-flex items-center ${
                            doctor.isVerified ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {doctorsData.pagination && doctorsData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={!doctorsData.pagination.hasPrev}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!doctorsData.pagination.hasNext}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{doctorsData.pagination.currentPage}</span> of{' '}
                      <span className="font-medium">{doctorsData.pagination.totalPages}</span> ({doctorsData.pagination.totalRecords} total doctors)
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={!doctorsData.pagination.hasPrev}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={!doctorsData.pagination.hasNext}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Doctor Detail Modal */}
      {showDoctorModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Doctor Profile - Dr. {selectedDoctor.user.firstName} {selectedDoctor.user.lastName}
                </h2>
                <button
                  onClick={() => setShowDoctorModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Image and Basic Info */}
                <div className="lg:col-span-1">
                  <div className="text-center">
                    {selectedDoctor.profileImage ? (
                      <img
                        src={`http://localhost:5000${selectedDoctor.profileImage}`}
                        alt={`Dr. ${selectedDoctor.user.firstName} ${selectedDoctor.user.lastName}`}
                        className="h-32 w-32 rounded-full object-cover mx-auto mb-4"
                      />
                    ) : (
                      <div className="h-32 w-32 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                        <UserGroupIcon className="h-16 w-16 text-primary-600" />
                      </div>
                    )}
                    <h3 className="text-xl font-semibold text-gray-900">
                      Dr. {selectedDoctor.user.firstName} {selectedDoctor.user.lastName}
                    </h3>
                    <p className="text-primary-600">
                      {getDepartmentLabel(selectedDoctor.department) || 'General Medicine'}
                    </p>
                    {(selectedDoctor.calculatedRating || 0) > 0 && (
                      <div className="flex items-center justify-center mt-2">
                        <StarIcon className="h-5 w-5 text-yellow-400 mr-1" />
                        <span className="text-gray-600">
                          {selectedDoctor.calculatedRating?.toFixed(1)}
                          {selectedDoctor.totalRatings && selectedDoctor.totalRatings > 0 && (
                            <span className="text-gray-500 ml-1">({selectedDoctor.totalRatings} reviews)</span>
                          )}
                        </span>
                      </div>
                    )}
                    {/* Verification Status */}
                    <div className="mt-3">
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getVerificationBadgeColor(selectedDoctor.isVerified)}`}>
                        {selectedDoctor.isVerified ? 'Verified Doctor' : 'Pending Verification'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detailed Information */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Personal Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Personal Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900">{selectedDoctor.user.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-gray-900">{selectedDoctor.user.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">BMDC Registration</label>
                        <p className="text-gray-900">{selectedDoctor.bmdcRegistrationNumber}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Experience</label>
                        <p className="text-gray-900">{selectedDoctor.experience} years</p>
                      </div>
                    </div>
                  </div>

                  {/* Professional Information */}
                  {(selectedDoctor.hospital || selectedDoctor.location) && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <MapPinIcon className="h-5 w-5 mr-2" />
                        Practice Location
                      </h4>
                      {selectedDoctor.hospital && (
                        <p className="text-gray-700 font-medium">{selectedDoctor.hospital}</p>
                      )}
                      {selectedDoctor.location && (
                        <p className="text-gray-600">{selectedDoctor.location}</p>
                      )}
                    </div>
                  )}

                  {/* Qualifications */}
                  {selectedDoctor.degrees && selectedDoctor.degrees.length > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <AcademicCapIcon className="h-5 w-5 mr-2" />
                        Qualifications
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedDoctor.degrees.map((degree, index) => (
                          <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                            {degree}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {selectedDoctor.bio && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">About</h4>
                      <p className="text-gray-700">{selectedDoctor.bio}</p>
                    </div>
                  )}

                  {/* Account Status */}
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Account Status</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Account Status</label>
                        <p className={`text-sm font-semibold ${selectedDoctor.user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedDoctor.user.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email Verified</label>
                        <p className={`text-sm font-semibold ${selectedDoctor.user.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedDoctor.user.emailVerified ? 'Yes' : 'No'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Last Login</label>
                        <p className="text-gray-900">
                          {selectedDoctor.user.lastLogin ? new Date(selectedDoctor.user.lastLogin).toLocaleString() : 'Never'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Member Since</label>
                        <p className="text-gray-900">{new Date(selectedDoctor.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => handleVerificationToggle(selectedDoctor)}
                  className={`btn-outline ${
                    selectedDoctor.isVerified ? 'text-red-600 border-red-300 hover:bg-red-50' : 'text-green-600 border-green-300 hover:bg-green-50'
                  }`}
                  disabled={verifyDoctorMutation.isPending}
                >
                  {selectedDoctor.isVerified ? 'Unverify Doctor' : 'Verify Doctor'}
                </button>
                <button
                  onClick={() => setShowDoctorModal(false)}
                  className="btn-primary"
                >
                  Close
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
