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
  ExclamationTriangleIcon
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
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Patient Management</h1>
        <p className="text-gray-600">Manage patient profiles and medical information.</p>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h3 className="text-lg font-medium text-gray-900">All Patients</h3>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field w-full sm:w-64 pl-10"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-full sm:w-auto"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
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
            <p className="text-red-600">Failed to load patients. Please try again later.</p>
          </div>
        ) : !patientsData?.patients || patientsData.patients.length === 0 ? (
          <div className="text-center py-8">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No patients found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Medical Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patientsData.patients.map((patient: Patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-700">
                                {patient.user.firstName.charAt(0)}{patient.user.lastName.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {patient.user.firstName} {patient.user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{patient.user.email}</div>
                            <div className="text-xs text-gray-400">
                              {patient.user.gender && `${patient.user.gender.charAt(0).toUpperCase() + patient.user.gender.slice(1)}`}
                              {patient.user.dateOfBirth && ` • ${calculateAge(patient.user.dateOfBirth)} years old`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.user.phone || 'No phone'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {patient.user.address ? (
                            patient.user.address.length > 30 ? 
                            `${patient.user.address.substring(0, 30)}...` : 
                            patient.user.address
                          ) : 'No address'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Blood: {patient.bloodType || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {patient.allergies ? (
                            patient.allergies.length > 20 ? 
                            `Allergies: ${patient.allergies.substring(0, 20)}...` : 
                            `Allergies: ${patient.allergies}`
                          ) : 'No known allergies'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(patient.user.isActive)}`}>
                            {patient.user.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {patient.user.emailVerified ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-500" title="Email Verified" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 text-red-500" title="Email Not Verified" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button 
                          onClick={() => handleViewPatient(patient)}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </button>
                        <button 
                          onClick={() => handleStatusToggle(patient)}
                          className={`inline-flex items-center ${
                            patient.user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {patientsData.pagination && patientsData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={!patientsData.pagination.hasPrev}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!patientsData.pagination.hasNext}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{patientsData.pagination.currentPage}</span> of{' '}
                      <span className="font-medium">{patientsData.pagination.totalPages}</span> ({patientsData.pagination.totalRecords} total patients)
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={!patientsData.pagination.hasPrev}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={!patientsData.pagination.hasNext}
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

      {/* Patient Detail Modal */}
      {showPatientModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Patient Profile - {selectedPatient.user.firstName} {selectedPatient.user.lastName}
                </h2>
                <button
                  onClick={() => setShowPatientModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <UserGroupIcon className="h-5 w-5" />
                    Personal Information
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Full Name</label>
                      <p className="text-gray-900">{selectedPatient.user.firstName} {selectedPatient.user.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900">{selectedPatient.user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-gray-900">{selectedPatient.user.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                      <p className="text-gray-900">
                        {selectedPatient.user.dateOfBirth ? 
                          `${new Date(selectedPatient.user.dateOfBirth).toLocaleDateString()} (${calculateAge(selectedPatient.user.dateOfBirth)} years old)` : 
                          'Not provided'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Gender</label>
                      <p className="text-gray-900 capitalize">{selectedPatient.user.gender || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Address</label>
                      <p className="text-gray-900">{selectedPatient.user.address || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <HeartIcon className="h-5 w-5" />
                    Medical Information
                  </h3>
                  <div className="bg-red-50 p-4 rounded-lg space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Blood Type</label>
                      <p className="text-gray-900">{selectedPatient.bloodType || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Allergies</label>
                      <p className="text-gray-900">{selectedPatient.allergies || 'None reported'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Current Medications</label>
                      <p className="text-gray-900">{selectedPatient.currentMedications || 'None reported'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Medical History</label>
                      <p className="text-gray-900">{selectedPatient.medicalHistory || 'None reported'}</p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    Emergency Contact
                  </h3>
                  <div className="bg-yellow-50 p-4 rounded-lg space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contact Name</label>
                      <p className="text-gray-900">{selectedPatient.emergencyContact || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contact Phone</label>
                      <p className="text-gray-900">{selectedPatient.emergencyPhone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Insurance Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5" />
                    Insurance Information
                  </h3>
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Insurance Provider</label>
                      <p className="text-gray-900">{selectedPatient.insuranceProvider || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Insurance Number</label>
                      <p className="text-gray-900">{selectedPatient.insuranceNumber || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div className="col-span-full space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Account Status</h3>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Account Status</label>
                        <p className={`text-sm font-semibold ${selectedPatient.user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedPatient.user.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email Verified</label>
                        <p className={`text-sm font-semibold ${selectedPatient.user.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedPatient.user.emailVerified ? 'Yes' : 'No'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Last Login</label>
                        <p className="text-gray-900">
                          {selectedPatient.user.lastLogin ? new Date(selectedPatient.user.lastLogin).toLocaleString() : 'Never'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Appointments */}
                {selectedPatient.appointments && selectedPatient.appointments.length > 0 && (
                  <div className="col-span-full space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5" />
                      Recent Appointments
                    </h3>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="space-y-2">
                        {selectedPatient.appointments.slice(0, 5).map((appointment) => (
                          <div key={appointment.id} className="flex justify-between items-center p-3 bg-white rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">
                                Dr. {appointment.doctor.user.firstName} {appointment.doctor.user.lastName}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(appointment.appointmentDate).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {appointment.status}
                            </span>
                          </div>
                        ))}
                        {selectedPatient.appointments.length > 5 && (
                          <p className="text-sm text-gray-500 text-center">
                            +{selectedPatient.appointments.length - 5} more appointments
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => handleStatusToggle(selectedPatient)}
                  className={`btn-outline ${
                    selectedPatient.user.isActive ? 'text-red-600 border-red-300 hover:bg-red-50' : 'text-green-600 border-green-300 hover:bg-green-50'
                  }`}
                  disabled={updatePatientStatusMutation.isPending}
                >
                  {selectedPatient.user.isActive ? 'Deactivate Patient' : 'Activate Patient'}
                </button>
                <button
                  onClick={() => setShowPatientModal(false)}
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

export default AdminPatients;
