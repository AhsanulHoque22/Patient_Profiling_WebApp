import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  DocumentTextIcon, 
  EyeIcon, 
  ArrowDownTrayIcon,
  XMarkIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import PrescriptionView from '../components/PrescriptionView';
import MedicineHistory from '../components/MedicineHistory';
import { getDepartmentLabel } from '../utils/departments';

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
  patient: {
    id: number;
    bloodType: string;
    allergies: string;
    medicalHistory: string;
    currentMedications: string;
    emergencyContact: string;
    emergencyPhone: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
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

const MedicalRecords: React.FC = () => {
  const { user } = useAuth();
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<AppointmentMedicalRecord | null>(null);
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'appointments' | 'medicines'>('appointments');

  // Get patient ID first
  const { data: patientProfile } = useQuery({
    queryKey: ['patient-profile'],
    queryFn: async () => {
      const response = await axios.get('/patients/profile');
      return response.data.data.patient;
    },
    enabled: user?.role === 'patient',
  });

  // Fetch completed appointments as medical records
  const { data: appointments, isLoading } = useQuery<AppointmentMedicalRecord[]>({
    queryKey: ['patient-appointments', patientProfile?.id],
    queryFn: async () => {
      const response = await axios.get('/appointments');
      // Filter only completed appointments
      const completedAppointments = response.data.data.appointments.filter((apt: any) => 
        apt.status === 'completed'
      );
      return completedAppointments || [];
    },
    enabled: !!patientProfile?.id,
    refetchInterval: 10000, // Refetch every 10 seconds for dynamic updates
  });

  // Filter appointments based on selected filter
  const filteredAppointments = appointments?.filter((apt) => {
    if (recordTypeFilter === 'all') return true;
    if (recordTypeFilter === 'consultation') return apt.type === 'in_person' || apt.type === 'telemedicine';
    if (recordTypeFilter === 'follow_up') return apt.type === 'follow_up';
    return true;
  }) || [];

  const handleViewDetails = async (appointment: AppointmentMedicalRecord) => {
    setSelectedRecord(appointment);
    setShowDetailModal(true);
    
    // Fetch prescription data if available
    try {
      const response = await axios.get(`/prescriptions/appointment/${appointment.id}`);
      setPrescriptionData(response.data.data.prescription);
    } catch (error) {
      console.log('No prescription found for this appointment');
      setPrescriptionData(null);
    }
  };

  const handleDownload = (appointment: AppointmentMedicalRecord) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MEDICAL RECORD', 105, 20, { align: 'center' });
    
    // Line under header
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);
    
    let yPos = 35;
    
    // Appointment Information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Appointment Information:', 20, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
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
    
    // Patient Information
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Information:', 20, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${appointment.patient.user.firstName} ${appointment.patient.user.lastName}`, 20, yPos);
    yPos += 5;
    doc.text(`Blood Type: ${appointment.patient.bloodType || 'Not provided'}`, 20, yPos);
    yPos += 5;
    doc.text(`Allergies: ${appointment.patient.allergies || 'None reported'}`, 20, yPos);
    yPos += 5;
    doc.text(`Current Medications: ${appointment.patient.currentMedications || 'None reported'}`, 20, yPos);
    yPos += 10;
    
    // Reason and Symptoms
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
    
    // Doctor's Notes
    if (appointment.notes) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text('Doctor\'s Notes:', 20, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(appointment.notes, 170);
      doc.text(notesLines, 20, yPos);
      yPos += notesLines.length * 5 + 5;
    }
    
    // Diagnosis
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
    
    // Appointment Duration
    if (appointment.startedAt && appointment.completedAt) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text('Appointment Duration:', 20, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      const start = new Date(appointment.startedAt);
      const end = new Date(appointment.completedAt);
      const diffMs = end.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      doc.text(`Started: ${start.toLocaleString()}`, 20, yPos);
      yPos += 5;
      doc.text(`Completed: ${end.toLocaleString()}`, 20, yPos);
      yPos += 5;
      doc.text(`Duration: ${duration}`, 20, yPos);
      yPos += 5;
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
    const fileName = `medical-record-${appointment.id}-${new Date(appointment.appointmentDate).toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Medical Records</h1>
        <p className="text-gray-600">View and manage your medical history and records.</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'appointments'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Appointment History
          </button>
          <button
            onClick={() => setActiveTab('medicines')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'medicines'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Medicine History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'appointments' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Appointment History</h3>
            <div className="flex space-x-2">
              <select 
                value={recordTypeFilter}
                onChange={(e) => setRecordTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
              >
                <option value="all">All Appointments</option>
                <option value="consultation">Consultations</option>
                <option value="follow_up">Follow-up Visits</option>
              </select>
            </div>
          </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading medical records...</p>
          </div>
        ) : filteredAppointments && filteredAppointments.length > 0 ? (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
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
                      <CalendarIcon className="h-4 w-4" />
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
                      onClick={() => handleViewDetails(appointment)}
                      className="flex items-center gap-1 text-primary-600 hover:text-primary-900 text-sm px-3 py-1 rounded hover:bg-primary-50 transition-colors"
                    >
                      <EyeIcon className="h-4 w-4" />
                      View Details
                    </button>
                    <button 
                      onClick={() => handleDownload(appointment)}
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
          <div className="text-center py-12">
            <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No completed appointments found</p>
            <p className="text-gray-400 text-sm mt-2">
              {recordTypeFilter !== 'all' 
                ? `No ${getAppointmentTypeLabel(recordTypeFilter)} appointments available` 
                : 'Your medical records will appear here after completed doctor visits'}
            </p>
          </div>
        )}
        </div>
      )}

      {/* Medicine History Tab */}
      {activeTab === 'medicines' && patientProfile?.id && (
        <div className="card">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">Medicine History</h3>
            <p className="text-sm text-gray-600">Track your medication history and adherence</p>
          </div>
          <MedicineHistory patientId={patientProfile.id} />
        </div>
      )}


      {/* View Details Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Medical Record Details
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
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
                        {selectedRecord.patient?.user?.firstName} {selectedRecord.patient?.user?.lastName}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900">{selectedRecord.patient?.user?.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-gray-900">{selectedRecord.patient?.user?.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Blood Type</label>
                      <p className="text-gray-900">{selectedRecord.patient?.bloodType || 'Not provided'}</p>
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
                        {getDepartmentLabel(selectedRecord.doctor?.department || '') || 'General Medicine'}
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
                      <p className="text-gray-900">{selectedRecord.patient?.allergies || 'None reported'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Current Medications</label>
                      <p className="text-gray-900">{selectedRecord.patient?.currentMedications || 'None reported'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Medical History</label>
                      <p className="text-gray-900">{selectedRecord.patient?.medicalHistory || 'None reported'}</p>
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
                      <p className="text-gray-900">{selectedRecord.patient?.emergencyContact || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contact Phone</label>
                      <p className="text-gray-900">{selectedRecord.patient?.emergencyPhone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => handleDownload(selectedRecord)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download Record
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
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

export default MedicalRecords;
