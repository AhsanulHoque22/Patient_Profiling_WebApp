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
  CalendarIcon,
  DocumentTextIcon,
  HeartIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  UserIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckBadgeIcon,
  XMarkIcon,
  EllipsisVerticalIcon,
  MapPinIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

interface Patient {
  id: number;
  bloodType: string;
  allergies: string;
  emergencyContact: string;
  emergencyPhone: string;
  insuranceProvider: string;
  insuranceNumber: string;
  medicalHistory: string;
  currentMedications: string;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    isActive: boolean;
    emailVerified: boolean;
    lastLogin: string;
  };
  appointments?: Array<{
    id: number;
    appointmentDate: string;
    status: string;
    doctor: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
}

const AdminPatients: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch patients with pagination and filters
  const { data: patientsData, isLoading, error } = useQuery({
    queryKey: ['admin-patients', page, searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { isActive: statusFilter }),
      });
      const response = await axios.get(`/admin/patients?${params}`);
      return response.data.data;
    },
  });

  // Update patient status mutation
  const updatePatientStatusMutation = useMutation({
    mutationFn: async ({ patientId, isActive }: { patientId: number; isActive: boolean }) => {
      const response = await axios.put(`/admin/patients/${patientId}/status`, { isActive });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-patients'] });
      toast.success('Patient status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update patient status');
    },
  });

  const handleStatusToggle = (patient: Patient) => {
    updatePatientStatusMutation.mutate({
      patientId: patient.user.id,
      isActive: !patient.user.isActive,
    });
  };

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientModal(true);
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <HeartIcon className="h-8 w-8 text-red-600 mr-3" />
              Patient Management
            </h1>
            <p className="text-gray-600">Comprehensive patient care and medical information management</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['admin-patients'] });
                toast.success('Data refreshed successfully');
              }}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
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
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900">{patientsData?.pagination?.totalRecords || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Patients</p>
              <p className="text-2xl font-bold text-gray-900">
                {patientsData?.patients?.filter((p: Patient) => p.user.isActive).length || 0}
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
              <p className="text-sm font-medium text-gray-600">Inactive Patients</p>
              <p className="text-2xl font-bold text-gray-900">
                {patientsData?.patients?.filter((p: Patient) => !p.user.isActive).length || 0}
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
              <p className="text-sm font-medium text-gray-600">Verified Accounts</p>
              <p className="text-2xl font-bold text-gray-900">
                {patientsData?.patients?.filter((p: Patient) => p.user.emailVerified).length || 0}
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
                  placeholder="Search patients by name, email, or phone number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
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
              <h3 className="text-lg font-medium text-red-800 mb-2">Failed to Load Patients</h3>
              <p className="text-red-600">Please try again later or contact support if the problem persists.</p>
            </div>
          </div>
        ) : !patientsData?.patients || patientsData.patients.length === 0 ? (
          <div className="p-8 text-center">
            <div className="bg-gray-50 rounded-xl p-8 max-w-md mx-auto">
              <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Patients Found</h3>
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
                      Patient Profile
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Contact Information
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Medical Information
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Account Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patientsData.patients.map((patient: Patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-6 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ring-2 ring-gray-100">
                              <span className="text-sm font-bold text-blue-700">
                                {patient.user.firstName.charAt(0)}{patient.user.lastName.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {patient.user.firstName} {patient.user.lastName}
                            </div>
                            <div className="text-sm text-gray-600">{patient.user.email}</div>
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <UserIcon className="h-3 w-3 mr-1" />
                              {patient.user.gender && `${patient.user.gender.charAt(0).toUpperCase() + patient.user.gender.slice(1)}`}
                              {patient.user.dateOfBirth && ` • ${calculateAge(patient.user.dateOfBirth)} years old`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {patient.user.phone || 'No phone'}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center mt-1">
                          <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {patient.user.address ? (
                            patient.user.address.length > 30 ? 
                            `${patient.user.address.substring(0, 30)}...` : 
                            patient.user.address
                          ) : 'No address'}
                        </div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <HeartIcon className="h-4 w-4 mr-2 text-red-400" />
                          Blood: {patient.bloodType || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {patient.allergies ? (
                            patient.allergies.length > 25 ? 
                            `Allergies: ${patient.allergies.substring(0, 25)}...` : 
                            `Allergies: ${patient.allergies}`
                          ) : 'No known allergies'}
                        </div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(patient.user.isActive)}`}>
                            {patient.user.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {patient.user.emailVerified ? (
                            <CheckBadgeIcon className="h-5 w-5 text-green-500" title="Email Verified" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-red-500" title="Email Not Verified" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button 
                            onClick={() => handleViewPatient(patient)}
                            className="inline-flex items-center px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View
                          </button>
                          <button 
                            onClick={() => handleStatusToggle(patient)}
                            className={`inline-flex items-center px-3 py-2 rounded-lg transition-colors ${
                              patient.user.isActive 
                                ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                                : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                            }`}
                            disabled={updatePatientStatusMutation.isPending}
                          >
                            {patient.user.isActive ? (
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
              {patientsData.patients.map((patient: Patient) => (
                <div key={patient.id} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ring-2 ring-gray-100">
                        <span className="text-lg font-bold text-blue-700">
                          {patient.user.firstName.charAt(0)}{patient.user.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {patient.user.firstName} {patient.user.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">{patient.user.email}</p>
                        <p className="text-xs text-gray-500 flex items-center mt-1">
                          <UserIcon className="h-3 w-3 mr-1" />
                          {patient.user.gender && `${patient.user.gender.charAt(0).toUpperCase() + patient.user.gender.slice(1)}`}
                          {patient.user.dateOfBirth && ` • ${calculateAge(patient.user.dateOfBirth)} years old`}
                        </p>
                      </div>
                    </div>
                    <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</p>
                      <p className="text-sm text-gray-900 flex items-center">
                        <PhoneIcon className="h-3 w-3 mr-1 text-gray-400" />
                        {patient.user.phone || 'No phone'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Type</p>
                      <p className="text-sm text-gray-900 flex items-center">
                        <HeartIcon className="h-3 w-3 mr-1 text-red-400" />
                        {patient.bloodType || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(patient.user.isActive)}`}>
                        {patient.user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {patient.user.emailVerified ? (
                        <CheckBadgeIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => handleViewPatient(patient)}
                      className="flex-1 mr-2 inline-flex items-center justify-center px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      View Details
                    </button>
                    <button 
                      onClick={() => handleStatusToggle(patient)}
                      className={`flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                        patient.user.isActive 
                          ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                          : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                      }`}
                      disabled={updatePatientStatusMutation.isPending}
                    >
                      {patient.user.isActive ? (
                        <>
                          <XCircleIcon className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {patientsData.pagination && patientsData.pagination.totalPages > 1 && (
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Showing page <span className="font-semibold text-gray-900">{patientsData.pagination.currentPage}</span> of{' '}
                    <span className="font-semibold text-gray-900">{patientsData.pagination.totalPages}</span> 
                    <span className="text-gray-500 ml-1">({patientsData.pagination.totalRecords} total patients)</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={!patientsData.pagination.hasPrev}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="hidden sm:flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, patientsData.pagination.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(patientsData.pagination.totalPages - 4, patientsData.pagination.currentPage - 2)) + i;
                        if (pageNum > patientsData.pagination.totalPages) return null;
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              pageNum === patientsData.pagination.currentPage
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
                      disabled={!patientsData.pagination.hasNext}
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

      {/* Patient Detail Modal */}
      {showPatientModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-red-600 to-pink-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center ring-4 ring-white/20">
                    <span className="text-2xl font-bold text-white">
                      {selectedPatient.user.firstName.charAt(0)}{selectedPatient.user.lastName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {selectedPatient.user.firstName} {selectedPatient.user.lastName}
                    </h2>
                    <p className="text-red-100">Patient Profile</p>
                    <div className="flex items-center mt-2">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        selectedPatient.user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedPatient.user.isActive ? 'Active Patient' : 'Inactive Patient'}
                      </span>
                      {selectedPatient.user.emailVerified && (
                        <CheckBadgeIcon className="h-5 w-5 text-white ml-3" title="Email Verified" />
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowPatientModal(false)}
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
                        <label className="text-sm font-medium text-gray-500 block mb-1">Full Name</label>
                        <p className="text-gray-900 font-medium">{selectedPatient.user.firstName} {selectedPatient.user.lastName}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Email Address</label>
                        <p className="text-gray-900">{selectedPatient.user.email}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Phone Number</label>
                        <p className="text-gray-900 flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {selectedPatient.user.phone || 'Not provided'}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Date of Birth</label>
                        <p className="text-gray-900 flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {selectedPatient.user.dateOfBirth ? 
                            `${new Date(selectedPatient.user.dateOfBirth).toLocaleDateString()} (${calculateAge(selectedPatient.user.dateOfBirth)} years old)` : 
                            'Not provided'
                          }
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Gender</label>
                        <p className="text-gray-900 capitalize">{selectedPatient.user.gender || 'Not provided'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Address</label>
                        <p className="text-gray-900 flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {selectedPatient.user.address || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Medical Information */}
                  <div className="bg-red-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <HeartIcon className="h-5 w-5 mr-2 text-red-600" />
                      Medical Information
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Blood Type</label>
                        <p className="text-gray-900">{selectedPatient.bloodType || 'Not provided'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Allergies</label>
                        <p className="text-gray-900">{selectedPatient.allergies || 'None reported'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Current Medications</label>
                        <p className="text-gray-900">{selectedPatient.currentMedications || 'None reported'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Medical History</label>
                        <p className="text-gray-900">{selectedPatient.medicalHistory || 'None reported'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-6">
                  {/* Emergency Contact */}
                  <div className="bg-yellow-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-600" />
                      Emergency Contact
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Contact Name</label>
                        <p className="text-gray-900">{selectedPatient.emergencyContact || 'Not provided'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Contact Phone</label>
                        <p className="text-gray-900 flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {selectedPatient.emergencyPhone || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Insurance Information */}
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                      Insurance Information
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Insurance Provider</label>
                        <p className="text-gray-900">{selectedPatient.insuranceProvider || 'Not provided'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Insurance Number</label>
                        <p className="text-gray-900 font-mono">{selectedPatient.insuranceNumber || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Account Status */}
                  <div className="bg-purple-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <ShieldCheckIcon className="h-5 w-5 mr-2 text-purple-600" />
                      Account Status
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Account Status</label>
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${selectedPatient.user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <p className={`text-sm font-semibold ${selectedPatient.user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedPatient.user.isActive ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Email Verified</label>
                        <div className="flex items-center">
                          {selectedPatient.user.emailVerified ? (
                            <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <XMarkIcon className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          <p className={`text-sm font-semibold ${selectedPatient.user.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedPatient.user.emailVerified ? 'Verified' : 'Not Verified'}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Last Login</label>
                        <p className="text-gray-900 flex items-center">
                          <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {selectedPatient.user.lastLogin ? new Date(selectedPatient.user.lastLogin).toLocaleString() : 'Never'}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Member Since</label>
                        <p className="text-gray-900 flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {new Date(selectedPatient.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Appointments */}
                  {selectedPatient.appointments && selectedPatient.appointments.length > 0 && (
                    <div className="bg-green-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CalendarIcon className="h-5 w-5 mr-2 text-green-600" />
                        Recent Appointments
                      </h3>
                      <div className="space-y-3">
                        {selectedPatient.appointments.slice(0, 5).map((appointment) => (
                          <div key={appointment.id} className="bg-white rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">
                                  Dr. {appointment.doctor.user.firstName} {appointment.doctor.user.lastName}
                                </p>
                                <p className="text-sm text-gray-600 flex items-center">
                                  <CalendarIcon className="h-3 w-3 mr-1" />
                                  {new Date(appointment.appointmentDate).toLocaleDateString()}
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {appointment.status}
                              </span>
                            </div>
                          </div>
                        ))}
                        {selectedPatient.appointments.length > 5 && (
                          <p className="text-sm text-gray-500 text-center">
                            +{selectedPatient.appointments.length - 5} more appointments
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowPatientModal(false)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleStatusToggle(selectedPatient)}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedPatient.user.isActive 
                      ? 'text-red-700 bg-red-100 hover:bg-red-200' 
                      : 'text-green-700 bg-green-100 hover:bg-green-200'
                  }`}
                  disabled={updatePatientStatusMutation.isPending}
                >
                  {selectedPatient.user.isActive ? 'Deactivate Patient' : 'Activate Patient'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPatients;
