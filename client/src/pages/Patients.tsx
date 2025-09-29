import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  UserGroupIcon, 
  EyeIcon, 
  CalendarIcon,
  DocumentTextIcon,
  PhoneIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

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
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    address: string;
  };
  appointments: Array<{
    id: number;
    appointmentDate: string;
    status: string;
  }>;
}

interface MedicalRecord {
  id: number;
  recordType: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  createdAt: string;
}

const Patients: React.FC = () => {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showMedicalRecords, setShowMedicalRecords] = useState(false);

  // Get doctor ID first, then fetch patients
  const { data: doctorProfile } = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: async () => {
      const response = await axios.get('/doctors/profile');
      return response.data.data.doctor;
    },
    enabled: user?.role === 'doctor',
  });

  const { data: patients, isLoading, error } = useQuery<Patient[]>({
    queryKey: ['doctor-patients', doctorProfile?.id],
    queryFn: async () => {
      const response = await axios.get(`/doctors/${doctorProfile?.id}/patients`);
      return response.data.data.patients;
    },
    enabled: !!doctorProfile?.id,
  });

  const { data: medicalRecords } = useQuery<MedicalRecord[]>({
    queryKey: ['patient-medical-records', selectedPatient?.id],
    queryFn: async () => {
      const response = await axios.get(`/patients/${selectedPatient?.id}/medical-records`);
      return response.data.data.medicalRecords;
    },
    enabled: !!selectedPatient?.id && showMedicalRecords,
  });

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientModal(true);
  };

  const handleViewMedicalRecords = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowMedicalRecords(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">My Patients</h1>
        <p className="text-gray-600">
          View and manage your patient list.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card text-center py-8">
          <p className="text-gray-500">Unable to load patients. Please try again later.</p>
        </div>
      ) : !patients || patients.length === 0 ? (
        <div className="card text-center py-8">
          <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No patients found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <div key={patient.id} className="card">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <UserGroupIcon className="h-6 w-6 text-primary-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {patient.user.firstName} {patient.user.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{patient.user.email}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {patient.user.phone && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Phone:</span> {patient.user.phone}
                    </p>
                  )}
                  {patient.bloodType && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Blood Type:</span> {patient.bloodType}
                    </p>
                  )}
                  {patient.allergies && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Allergies:</span> {patient.allergies}
                    </p>
                  )}
                  {patient.emergencyContact && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Emergency Contact:</span> {patient.emergencyContact}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleViewPatient(patient)}
                    className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-1"
                  >
                    <EyeIcon className="h-4 w-4" />
                    View Details
                  </button>
                  <button 
                    onClick={() => handleViewMedicalRecords(patient)}
                    className="btn-outline text-sm py-2 flex items-center justify-center gap-1"
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                    Records
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Patient Details Modal */}
      {showPatientModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Patient Details - {selectedPatient.user.firstName} {selectedPatient.user.lastName}
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
                    <UserIcon className="h-5 w-5" />
                    Personal Information
                  </h3>
                  <div className="space-y-3">
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
                      <p className="text-gray-900">{selectedPatient.user.dateOfBirth || 'Not provided'}</p>
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
                  <div className="space-y-3">
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
                  <div className="space-y-3">
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
                  <div className="space-y-3">
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
              </div>

              {/* Recent Appointments */}
              {selectedPatient.appointments && selectedPatient.appointments.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <CalendarIcon className="h-5 w-5" />
                    Recent Appointments
                  </h3>
                  <div className="space-y-2">
                    {selectedPatient.appointments.map((appointment) => (
                      <div key={appointment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(appointment.appointmentDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {appointment.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowPatientModal(false);
                    handleViewMedicalRecords(selectedPatient);
                  }}
                  className="btn-primary"
                >
                  View Medical Records
                </button>
                <button
                  onClick={() => setShowPatientModal(false)}
                  className="btn-outline"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Medical Records Modal */}
      {showMedicalRecords && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Medical Records - {selectedPatient.user.firstName} {selectedPatient.user.lastName}
                </h2>
                <button
                  onClick={() => setShowMedicalRecords(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {medicalRecords && medicalRecords.length > 0 ? (
                <div className="space-y-4">
                  {medicalRecords.map((record) => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{record.recordType}</h3>
                        <span className="text-sm text-gray-500">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Diagnosis</label>
                          <p className="text-gray-900">{record.diagnosis}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Treatment</label>
                          <p className="text-gray-900">{record.treatment}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Notes</label>
                          <p className="text-gray-900">{record.notes}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No medical records found for this patient.</p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowMedicalRecords(false)}
                  className="btn-outline"
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

export default Patients;
