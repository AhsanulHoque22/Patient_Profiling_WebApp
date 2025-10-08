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
  UserIcon,
  ClockIcon,
  XMarkIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import PrescriptionView from '../components/PrescriptionView';
import { getDepartmentLabel } from '../utils/departments';
import jsPDF from 'jspdf';

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

interface AppointmentMedicalRecord {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  serialNumber: number;
  type: string;
  status: string;
  reason: string;
  symptoms: string;
  notes: string;
  diagnosis: string;
  prescription: string;
  startedAt: string;
  completedAt: string;
  doctor: {
    id: number;
    department: string;
    experience: number;
    bmdcRegistrationNumber: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

interface PrescriptionData {
  id: number;
  appointmentId: number;
  medicines: Array<{
    name: string;
    dosage: string;
    schedule: string;
    instructions?: string;
  }>;
  tests: Array<{
    name: string;
    status: string;
    result?: string;
  }>;
  recommendations: string;
  exercises: string;
  followUpInstructions: string;
  emergencyInstructions: string;
  createdAt: string;
}

const Patients: React.FC = () => {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showMedicalRecords, setShowMedicalRecords] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AppointmentMedicalRecord | null>(null);
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData | null>(null);
  const [showRecordDetail, setShowRecordDetail] = useState(false);

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

  const { data: medicalRecords, isLoading: recordsLoading } = useQuery<AppointmentMedicalRecord[]>({
    queryKey: ['patient-appointments', selectedPatient?.id],
    queryFn: async () => {
      const response = await axios.get(`/patients/${selectedPatient?.id}/appointments`);
      // Filter only completed appointments
      const completedAppointments = response.data.data.appointments.filter((apt: any) => 
        apt.status === 'completed'
      );
      return completedAppointments || [];
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

  const handleViewRecordDetails = async (appointment: AppointmentMedicalRecord) => {
    setSelectedRecord(appointment);
    setShowRecordDetail(true);
    
    // Fetch prescription data if available
    try {
      const response = await axios.get(`/prescriptions/appointment/${appointment.id}`);
      setPrescriptionData(response.data.data.prescription);
    } catch (error) {
      console.log('No prescription found for this appointment');
      setPrescriptionData(null);
    }
  };

  const getAppointmentTypeColor = (type: string) => {
    switch (type) {
      case 'in_person':
        return 'bg-blue-100 text-blue-800';
      case 'telemedicine':
        return 'bg-green-100 text-green-800';
      case 'follow_up':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAppointmentTypeLabel = (type: string) => {
    switch (type) {
      case 'in_person':
        return 'In Person Consultation';
      case 'telemedicine':
        return 'Telemedicine Consultation';
      case 'follow_up':
        return 'Follow-up Visit';
      default:
        return type.replace('_', ' ').split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
  };

  const handleDownloadRecord = (appointment: AppointmentMedicalRecord) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MEDICAL RECORD', 105, 20, { align: 'center' });
    
    // Line under header
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);
    
    let yPos = 35;
    
    // Patient Information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Information:', 20, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${selectedPatient?.user.firstName} ${selectedPatient?.user.lastName}`, 20, yPos);
    yPos += 5;
    doc.text(`Email: ${selectedPatient?.user.email}`, 20, yPos);
    yPos += 5;
    doc.text(`Phone: ${selectedPatient?.user.phone || 'Not provided'}`, 20, yPos);
    yPos += 5;
    doc.text(`Blood Type: ${selectedPatient?.bloodType || 'Not provided'}`, 20, yPos);
    yPos += 10;
    
    // Appointment Information
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.text('Appointment Information:', 20, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(appointment.appointmentDate).toLocaleDateString()}`, 20, yPos);
    yPos += 5;
    doc.text(`Time: ${appointment.appointmentTime}`, 20, yPos);
    yPos += 5;
    doc.text(`Serial #: ${appointment.serialNumber}`, 20, yPos);
    yPos += 5;
    doc.text(`Type: ${appointment.type.replace('_', ' ').toUpperCase()}`, 20, yPos);
    yPos += 5;
    doc.text(`Doctor: Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`, 20, yPos);
    yPos += 5;
    doc.text(`Department: ${getDepartmentLabel(appointment.doctor.department)}`, 20, yPos);
    yPos += 10;
    
    // Medical Details
    if (appointment.reason || appointment.symptoms) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text('Appointment Details:', 20, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      
      if (appointment.reason) {
        doc.text(`Reason: ${appointment.reason}`, 20, yPos);
        yPos += 5;
      }
      if (appointment.symptoms) {
        const symptomLines = doc.splitTextToSize(`Symptoms: ${appointment.symptoms}`, 170);
        doc.text(symptomLines, 20, yPos);
        yPos += symptomLines.length * 5 + 5;
      }
    }
    
    // Diagnosis and Notes
    if (appointment.diagnosis || appointment.notes) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      if (appointment.notes) {
        doc.setFont('helvetica', 'bold');
        doc.text('Doctor\'s Notes:', 20, yPos);
        yPos += 7;
        doc.setFont('helvetica', 'normal');
        const notesLines = doc.splitTextToSize(appointment.notes, 170);
        doc.text(notesLines, 20, yPos);
        yPos += notesLines.length * 5 + 5;
      }
      
      if (appointment.diagnosis) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.text('Diagnosis:', 20, yPos);
        yPos += 7;
        doc.setFont('helvetica', 'normal');
        const diagnosisLines = doc.splitTextToSize(appointment.diagnosis, 170);
        doc.text(diagnosisLines, 20, yPos);
        yPos += diagnosisLines.length * 5 + 5;
      }
    }
    
    // Prescription
    if (appointment.prescription) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text('Prescription:', 20, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      const prescriptionLines = doc.splitTextToSize(appointment.prescription, 170);
      doc.text(prescriptionLines, 20, yPos);
      yPos += prescriptionLines.length * 5 + 5;
    }
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
      doc.text('This is a computer-generated medical record', 105, 285, { align: 'center' });
    }
    
    // Save the PDF
    const fileName = `medical-record-${selectedPatient?.user.firstName}-${selectedPatient?.user.lastName}-${appointment.id}-${new Date(appointment.appointmentDate).toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
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

              {recordsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading medical records...</p>
                </div>
              ) : medicalRecords && medicalRecords.length > 0 ? (
                <div className="space-y-4">
                  {medicalRecords.map((appointment) => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getAppointmentTypeColor(appointment.type)}`}>
                              {getAppointmentTypeLabel(appointment.type)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(appointment.appointmentDate).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                            <span className="text-xs text-gray-500">
                              Serial #{appointment.serialNumber}
                            </span>
                          </div>
                          <h4 className="font-medium text-gray-900 mb-1">
                            Appointment with Dr. {appointment.doctor.user.firstName} {appointment.doctor.user.lastName}
                          </h4>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                            <ClockIcon className="h-4 w-4" />
                            {appointment.appointmentTime} • {getDepartmentLabel(appointment.doctor.department)}
                          </p>
                          {appointment.reason && (
                            <p className="text-sm text-gray-700 mt-1">
                              <span className="font-medium">Reason:</span> {appointment.reason.length > 100 ? `${appointment.reason.substring(0, 100)}...` : appointment.reason}
                            </p>
                          )}
                          {appointment.diagnosis && (
                            <p className="text-sm text-gray-700 mt-1">
                              <span className="font-medium">Diagnosis:</span> {appointment.diagnosis.length > 100 ? `${appointment.diagnosis.substring(0, 100)}...` : appointment.diagnosis}
                            </p>
                          )}
                          {appointment.startedAt && appointment.completedAt && (
                            <p className="text-sm text-gray-700 mt-1">
                              <span className="font-medium">Duration:</span> {(() => {
                                const start = new Date(appointment.startedAt);
                                const end = new Date(appointment.completedAt);
                                const diffMs = end.getTime() - start.getTime();
                                const diffMins = Math.floor(diffMs / 60000);
                                const hours = Math.floor(diffMins / 60);
                                const mins = diffMins % 60;
                                return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                              })()}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button 
                            onClick={() => handleViewRecordDetails(appointment)}
                            className="flex items-center gap-1 text-primary-600 hover:text-primary-900 text-sm px-3 py-1 rounded hover:bg-primary-50 transition-colors"
                          >
                            <EyeIcon className="h-4 w-4" />
                            View Details
                          </button>
                          <button 
                            onClick={() => handleDownloadRecord(appointment)}
                            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm px-3 py-1 rounded hover:bg-gray-50 transition-colors"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No completed appointments found for this patient.</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Medical records will appear here after completed appointments.
                  </p>
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

      {/* Detailed Record View Modal */}
      {showRecordDetail && selectedRecord && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Medical Record Details
                </h2>
                <button
                  onClick={() => setShowRecordDetail(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Patient Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Patient Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p className="text-gray-900">
                        {selectedPatient.user.firstName} {selectedPatient.user.lastName}
                      </p>
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
                      <label className="text-sm font-medium text-gray-500">Blood Type</label>
                      <p className="text-gray-900">{selectedPatient.bloodType || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Appointment Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Appointment Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date</label>
                      <p className="text-gray-900">
                        {new Date(selectedRecord.appointmentDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Time</label>
                      <p className="text-gray-900">{selectedRecord.appointmentTime}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Serial Number</label>
                      <p className="text-gray-900">#{selectedRecord.serialNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Type</label>
                      <p className="text-gray-900 capitalize">{selectedRecord.type.replace('_', ' ')}</p>
                    </div>
                    {selectedRecord.startedAt && selectedRecord.completedAt && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Started At</label>
                          <p className="text-gray-900">
                            {new Date(selectedRecord.startedAt).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Completed At</label>
                          <p className="text-gray-900">
                            {new Date(selectedRecord.completedAt).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Total Duration</label>
                          <p className="text-green-700 font-semibold">
                            {(() => {
                              const start = new Date(selectedRecord.startedAt);
                              const end = new Date(selectedRecord.completedAt);
                              const diffMs = end.getTime() - start.getTime();
                              const diffMins = Math.floor(diffMs / 60000);
                              const hours = Math.floor(diffMins / 60);
                              const mins = diffMins % 60;
                              return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                            })()}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Doctor Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Doctor Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p className="text-gray-900">
                        Dr. {selectedRecord.doctor?.user?.firstName} {selectedRecord.doctor?.user?.lastName}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Department</label>
                      <p className="text-gray-900">
                        {getDepartmentLabel(selectedRecord.doctor?.department) || 'General Medicine'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">BMDC Registration</label>
                      <p className="text-gray-900">{selectedRecord.doctor?.bmdcRegistrationNumber || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Experience</label>
                      <p className="text-gray-900">{selectedRecord.doctor?.experience || 0} years</p>
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Medical Information</h3>
                  <div className="space-y-3">
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

                {/* Reason & Symptoms */}
                <div className="col-span-full space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Appointment Reason</h3>
                  <div className="space-y-3">
                    {selectedRecord.reason && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Reason</label>
                        <p className="text-gray-900">{selectedRecord.reason}</p>
                      </div>
                    )}
                    {selectedRecord.symptoms && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Symptoms</label>
                        <p className="text-gray-900">{selectedRecord.symptoms}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Doctor's Notes, Diagnosis & Prescription */}
                <div className="col-span-full space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Medical Details</h3>
                  <div className="space-y-4">
                    {selectedRecord.notes && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <label className="text-sm font-medium text-green-900">Doctor's Notes</label>
                        <p className="text-green-800 mt-1">{selectedRecord.notes}</p>
                      </div>
                    )}
                    {selectedRecord.diagnosis && (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <label className="text-sm font-medium text-purple-900">Diagnosis</label>
                        <p className="text-purple-800 mt-1">{selectedRecord.diagnosis}</p>
                      </div>
                    )}
                    {selectedRecord.prescription && (
                      <div className="bg-indigo-50 p-4 rounded-lg">
                        <label className="text-sm font-medium text-indigo-900">Prescription</label>
                        <p className="text-indigo-800 mt-1">{selectedRecord.prescription}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Prescription Details */}
                {prescriptionData && (
                  <div className="col-span-full">
                    <PrescriptionView 
                      prescriptionData={prescriptionData}
                      appointmentData={selectedRecord}
                      userRole={user?.role}
                    />
                  </div>
                )}

                {/* Emergency Contact */}
                <div className="col-span-full space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => handleDownloadRecord(selectedRecord)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download Record
                </button>
                <button
                  onClick={() => setShowRecordDetail(false)}
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

export default Patients;
