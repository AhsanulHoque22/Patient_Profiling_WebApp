import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ClockIcon, 
  CheckIcon, 
  XMarkIcon,
  CalendarIcon,
  UserIcon,
  EyeIcon,
  FunnelIcon,
  CheckCircleIcon,
  PlayIcon,
  DocumentTextIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import PrescriptionInterface from '../components/PrescriptionInterface';
import PrescriptionView from '../components/PrescriptionView';

interface Appointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  status: 'requested' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  serialNumber: number;
  type: string;
  reason: string;
  symptoms: string;
  notes: string;
  diagnosis: string;
  prescription: string;
  startedAt?: string;
  completedAt?: string;
  patient: {
    id: number;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: string;
      gender: string;
      address: string;
    };
    bloodType: string;
    allergies: string;
    medicalHistory: string;
    currentMedications: string;
    emergencyContact: string;
    emergencyPhone: string;
  };
}

const DoctorAppointments: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showVideoInPrescription, setShowVideoInPrescription] = useState(false);
  const [selectedAppointmentForPrescription, setSelectedAppointmentForPrescription] = useState<Appointment | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    appointmentDate: '',
    timeBlock: '09:00-12:00'
  });
  const [isLoading, setIsLoading] = useState(false);

  const timeBlocks = [
    { value: '09:00-12:00', label: 'Morning Chamber (9:00 AM - 12:00 PM)' },
    { value: '14:00-17:00', label: 'Afternoon Chamber (2:00 PM - 5:00 PM)' },
    { value: '19:00-22:00', label: 'Evening Chamber (7:00 PM - 10:00 PM)' }
  ];

  // Fetch appointments
  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      // First get the doctor profile to get the doctor ID
      const doctorProfileResponse = await axios.get('/doctors/profile');
      const doctorId = doctorProfileResponse.data.data.doctor.id;
      
      // Then fetch appointments for this specific doctor (get all appointments, not just first page)
      const response = await axios.get(`/doctors/${doctorId}/appointments`, {
        params: { limit: 1000 } // Get all appointments, not just first 10
      });
      const appointments = response.data.data.appointments || [];
      
      console.log('Fetched appointments:', appointments.length);
      console.log('Appointments with requested status:', appointments.filter((apt: any) => apt.status === 'requested'));
      
      setAppointments(appointments);
      
      // Show success message if we have appointments
      if (appointments.length > 0) {
        toast.success(`Loaded ${appointments.length} appointments`);
      } else {
        toast('No appointments found', { icon: 'ℹ️' });
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Filter and sort appointments
  useEffect(() => {
    console.log('🔍 Raw appointments data:', appointments.length, 'appointments');
    console.log('🔍 First appointment sample:', appointments[0]);
    
    let filtered = appointments;
    
    // Apply status filter
    if (selectedFilter !== 'all') {
      filtered = appointments.filter(app => app.status === selectedFilter);
    }
    
    console.log('🔍 After filtering:', filtered.length, 'appointments');
    
    // Backend now provides data in DESC order, but let's ensure frontend sorting too
    filtered = [...filtered].sort((a, b) => {
      // Compare dates first (descending order)
      const dateCompare = b.appointmentDate.localeCompare(a.appointmentDate);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      
      // If dates are same, compare times (descending order)
      const timeA = a.appointmentTime || '00:00';
      const timeB = b.appointmentTime || '00:00';
      return timeB.localeCompare(timeA);
    });
    
    console.log('✅ Final sorted appointments (first 5):', filtered.slice(0, 5).map(app => ({
      id: app.id,
      date: app.appointmentDate,
      time: app.appointmentTime,
      status: app.status,
      serial: app.serialNumber
    })));
    
    setFilteredAppointments(filtered);
  }, [selectedFilter, appointments]);

  // Approve appointment
  const handleApprove = async (appointmentId: number) => {
    setIsLoading(true);
    try {
      console.log('Attempting to approve appointment:', appointmentId);
      const response = await axios.put(`/appointments/${appointmentId}/approve`);
      console.log('Approve response:', response.data);
      toast.success('Appointment approved successfully!');
      await fetchAppointments();
    } catch (error: any) {
      console.error('Approve appointment error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      toast.error(error.response?.data?.message || 'Failed to approve appointment');
    } finally {
      setIsLoading(false);
    }
  };

  // Decline appointment
  const handleDecline = async (appointmentId: number, reason?: string) => {
    if (!window.confirm('Are you sure you want to decline this appointment?')) {
      return;
    }

    setIsLoading(true);
    try {
      await axios.put(`/appointments/${appointmentId}/decline`, { reason });
      toast.success('Appointment declined');
      await fetchAppointments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to decline appointment');
    } finally {
      setIsLoading(false);
    }
  };

  // Mark appointment as in progress
  const handleStartAppointment = async (appointmentId: number) => {
    if (!window.confirm('Start this appointment? This will mark it as in progress.')) {
      return;
    }

    setIsLoading(true);
    try {
      await axios.put(`/appointments/${appointmentId}/start`);
      toast.success('Appointment started - now in progress');
      await fetchAppointments();
      
      // Open prescription interface for the started appointment
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (appointment) {
        setSelectedAppointmentForPrescription(appointment);
        setShowPrescriptionModal(true);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start appointment');
    } finally {
      setIsLoading(false);
    }
  };

  // Mark appointment as completed
  const handleComplete = async (appointmentId: number) => {
    const confirmMessage = `Are you sure you want to complete this appointment?

⚠️ IMPORTANT WARNING:
- Once completed, the prescription cannot be edited
- Make sure all prescription details are finalized
- This action cannot be undone

Do you want to proceed?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    try {
      await axios.put(`/appointments/${appointmentId}/complete`);
      toast.success('Appointment marked as completed');
      await fetchAppointments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete appointment');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle prescription completion
  const handlePrescriptionComplete = () => {
    setShowPrescriptionModal(false);
    setSelectedAppointmentForPrescription(null);
    setShowVideoInPrescription(false);
    fetchAppointments(); // Refresh appointments list
  };

  // Handle complete appointment from prescription interface
  const handleCompleteFromPrescription = async (appointmentId: number) => {
    const confirmMessage = `Are you sure you want to complete this appointment?

⚠️ IMPORTANT WARNING:
- Once completed, the prescription cannot be edited
- Make sure all prescription details are finalized
- This action cannot be undone

Do you want to proceed?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    try {
      await axios.put(`/appointments/${appointmentId}/complete`);
      toast.success('Appointment marked as completed');
      setShowPrescriptionModal(false);
      setSelectedAppointmentForPrescription(null);
      setShowVideoInPrescription(false);
      await fetchAppointments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete appointment');
    } finally {
      setIsLoading(false);
    }
  };


  const handleVideoCallInPrescription = () => {
    setShowVideoInPrescription(true);
  };

  // Reschedule appointment
  const handleReschedule = async () => {
    if (!selectedAppointment) return;

    setIsLoading(true);
    try {
      await axios.put(`/appointments/${selectedAppointment.id}/reschedule-requested`, rescheduleForm);
      toast.success('Appointment rescheduled and approved!');
      setShowRescheduleModal(false);
      setSelectedAppointment(null);
      setRescheduleForm({ appointmentDate: '', timeBlock: '09:00-12:00' });
      await fetchAppointments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reschedule appointment');
    } finally {
      setIsLoading(false);
    }
  };

  // View patient details
  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  // Open reschedule modal
  const openRescheduleModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleForm({
      appointmentDate: new Date(appointment.appointmentDate).toISOString().split('T')[0],
      timeBlock: '09:00-12:00'
    });
    setShowRescheduleModal(true);
  };

  // Calculate appointment duration
  const calculateDuration = (startedAt?: string, completedAt?: string) => {
    if (!startedAt || !completedAt) return null;
    
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minutes`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      requested: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-orange-100 text-orange-800'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="page-header">Appointment Management</h1>
          <p className="text-gray-600">Review and manage patient appointment requests.</p>
        </div>
        <button
          onClick={() => {
            console.log('🔄 Manual sort trigger');
            console.log('Current appointments:', appointments);
            console.log('Current filtered:', filteredAppointments);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
        >
          Debug Sort
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-3 flex-wrap">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-700">Filter:</span>
          {[
            { value: 'all', label: 'All' },
            { value: 'requested', label: 'Requested' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' }
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setSelectedFilter(filter.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedFilter === filter.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
              {filter.value !== 'all' && (
                <span className="ml-2 text-xs">
                  ({appointments.filter(app => app.status === filter.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                      <span className="ml-2">Loading appointments...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {appointments.length === 0 ? (
                      <div>
                        <p className="text-lg font-medium mb-2">No appointments found</p>
                        <p className="text-sm">You don't have any appointments yet.</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg font-medium mb-2">No appointments found for "{selectedFilter}" filter</p>
                        <p className="text-sm">Try selecting a different filter or check "All" to see all appointments.</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        #{appointment.serialNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-primary-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.patient.user.firstName} {appointment.patient.user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{appointment.patient.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(appointment.appointmentDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {appointment.appointmentTime}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">
                        {appointment.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleViewDetails(appointment)}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <EyeIcon className="h-5 w-5 inline" />
                      </button>
                      {appointment.status === 'requested' && (
                        <>
                          <button
                            onClick={() => handleApprove(appointment.id)}
                            disabled={isLoading}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckIcon className="h-5 w-5 inline" />
                          </button>
                          <button
                            onClick={() => openRescheduleModal(appointment)}
                            disabled={isLoading}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            title="Reschedule"
                          >
                            <ClockIcon className="h-5 w-5 inline" />
                          </button>
                          <button
                            onClick={() => handleDecline(appointment.id)}
                            disabled={isLoading}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="Decline"
                          >
                            <XMarkIcon className="h-5 w-5 inline" />
                          </button>
                        </>
                      )}
                      {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                        <button
                          onClick={() => handleStartAppointment(appointment.id)}
                          disabled={isLoading}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          title="Start Appointment (In Progress)"
                        >
                          <PlayIcon className="h-5 w-5 inline" />
                        </button>
                      )}
                      {appointment.type === 'telemedicine' && (appointment.status === 'confirmed' || appointment.status === 'in_progress') && (
                        <button
                          onClick={() => {
                            setSelectedAppointmentForPrescription(appointment);
                            setShowPrescriptionModal(true);
                            setShowVideoInPrescription(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="Start Video Consultation"
                        >
                          <VideoCameraIcon className="h-5 w-5 inline" />
                        </button>
                      )}
                      {appointment.status === 'in_progress' && (
                        <button
                          onClick={() => {
                            setSelectedAppointmentForPrescription(appointment);
                            setShowPrescriptionModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50 mr-2"
                          title="Manage Prescription"
                        >
                          <DocumentTextIcon className="h-5 w-5 inline" />
                        </button>
                      )}
                      {(appointment.status === 'in_progress' || appointment.status === 'confirmed') && (
                        <button
                          onClick={() => handleComplete(appointment.id)}
                          disabled={isLoading}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          title="Mark as Completed"
                        >
                          <CheckCircleIcon className="h-5 w-5 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Appointment Details
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
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
                        {selectedAppointment.patient.user.firstName} {selectedAppointment.patient.user.lastName}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900">{selectedAppointment.patient.user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-gray-900">{selectedAppointment.patient.user.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Blood Type</label>
                      <p className="text-gray-900">{selectedAppointment.patient.bloodType || 'Not provided'}</p>
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
                        {new Date(selectedAppointment.appointmentDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Time</label>
                      <p className="text-gray-900">{selectedAppointment.appointmentTime}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Type</label>
                      <p className="text-gray-900 capitalize">{selectedAppointment.type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedAppointment.status)}`}>
                        {selectedAppointment.status}
                      </span>
                    </div>
                    {selectedAppointment.status === 'completed' && selectedAppointment.startedAt && selectedAppointment.completedAt && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Started At</label>
                          <p className="text-gray-900">
                            {new Date(selectedAppointment.startedAt).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Completed At</label>
                          <p className="text-gray-900">
                            {new Date(selectedAppointment.completedAt).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Total Duration</label>
                          <p className="text-green-700 font-semibold">
                            {calculateDuration(selectedAppointment.startedAt, selectedAppointment.completedAt)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Medical Information */}
                <div className="col-span-full space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Medical Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Allergies</label>
                      <p className="text-gray-900">{selectedAppointment.patient.allergies || 'None reported'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Current Medications</label>
                      <p className="text-gray-900">{selectedAppointment.patient.currentMedications || 'None reported'}</p>
                    </div>
                    <div className="col-span-full">
                      <label className="text-sm font-medium text-gray-500">Medical History</label>
                      <p className="text-gray-900">{selectedAppointment.patient.medicalHistory || 'None reported'}</p>
                    </div>
                    <div className="col-span-full">
                      <button
                        onClick={() => window.open(`/admin-lab-reports?patientId=${selectedAppointment.patient.id}`, '_blank')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                      >
                        <DocumentTextIcon className="h-4 w-4" />
                        View Patient Reports
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reason & Symptoms */}
                <div className="col-span-full space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Appointment Reason</h3>
                  <div className="space-y-3">
                    {selectedAppointment.reason && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Reason</label>
                        <p className="text-gray-900">{selectedAppointment.reason}</p>
                      </div>
                    )}
                    {selectedAppointment.symptoms && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Symptoms</label>
                        <p className="text-gray-900">{selectedAppointment.symptoms}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Doctor's Notes, Diagnosis & Prescription */}
                <div className="col-span-full space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Medical Details</h3>
                  <div className="space-y-4">
                    {selectedAppointment.notes && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <label className="text-sm font-medium text-green-900">Doctor's Notes</label>
                        <p className="text-green-800 mt-1">{selectedAppointment.notes}</p>
                      </div>
                    )}
                    {selectedAppointment.diagnosis && (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <label className="text-sm font-medium text-purple-900">Diagnosis</label>
                        <p className="text-purple-800 mt-1">{selectedAppointment.diagnosis}</p>
                      </div>
                    )}
                    {selectedAppointment.prescription && (
                      <div className="bg-indigo-50 p-4 rounded-lg">
                        <label className="text-sm font-medium text-indigo-900">Prescription</label>
                        <p className="text-indigo-800 mt-1">{selectedAppointment.prescription}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="col-span-full space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contact Name</label>
                      <p className="text-gray-900">{selectedAppointment.patient.emergencyContact || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contact Phone</label>
                      <p className="text-gray-900">{selectedAppointment.patient.emergencyPhone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {selectedAppointment.status === 'requested' && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedAppointment.id)}
                      disabled={isLoading}
                      className="btn-primary flex items-center gap-2"
                    >
                      <CheckIcon className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        openRescheduleModal(selectedAppointment);
                      }}
                      disabled={isLoading}
                      className="btn-outline flex items-center gap-2"
                    >
                      <ClockIcon className="h-4 w-4" />
                      Reschedule
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="btn-outline"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Reschedule Appointment
                </h2>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
                  <input
                    type="date"
                    value={rescheduleForm.appointmentDate}
                    onChange={(e) => setRescheduleForm({...rescheduleForm, appointmentDate: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Block</label>
                  <select
                    value={rescheduleForm.timeBlock}
                    onChange={(e) => setRescheduleForm({...rescheduleForm, timeBlock: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    {timeBlocks.map((block) => (
                      <option key={block.value} value={block.value}>
                        {block.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={handleReschedule}
                  disabled={isLoading || !rescheduleForm.appointmentDate}
                  className="btn-primary"
                >
                  Reschedule & Approve
                </button>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Interface Modal */}
      {showPrescriptionModal && selectedAppointmentForPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-1 sm:p-2">
          <div className="bg-white rounded-lg max-w-[98vw] w-full h-[98vh] flex flex-col overflow-hidden">
            <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 flex-1 min-w-0 pr-4">
                  <span className="truncate block">
                    {selectedAppointmentForPrescription.type === 'telemedicine' 
                      ? 'Telemedicine Consultation' 
                      : 'Prescription Management'
                    }
                  </span>
                  <span className="text-sm sm:text-base text-gray-600 truncate block">
                    {selectedAppointmentForPrescription.patient.user.firstName} {selectedAppointmentForPrescription.patient.user.lastName}
                  </span>
                </h2>
                <button
                  onClick={() => {
                    setShowPrescriptionModal(false);
                    setSelectedAppointmentForPrescription(null);
                    setShowVideoInPrescription(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1"
                >
                  <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Main Content Grid */}
              {selectedAppointmentForPrescription.type === 'telemedicine' ? (
                /* Telemedicine: Responsive layout - stacked on mobile, side-by-side on large screens */
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 h-full">
                  {/* Left Column - Video Consultation (2/5 width on large screens) */}
                  <div className="lg:col-span-2 flex flex-col">
                    <div className="bg-gray-50 rounded-lg p-3 flex-1 flex flex-col">
                      <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <VideoCameraIcon className="h-4 w-4 text-blue-600" />
                        Video Call
                      </h3>
                      {!showVideoInPrescription ? (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-600">
                            Start video consultation with the patient.
                          </p>
                          <button
                            onClick={handleVideoCallInPrescription}
                            className="w-full bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            <VideoCameraIcon className="h-4 w-4" />
                            Start Video
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-xs text-green-600 font-medium">Live</span>
                            </div>
                            <button
                              onClick={() => setShowVideoInPrescription(false)}
                              className="text-red-600 hover:text-red-700 text-xs font-medium px-2 py-1 rounded"
                            >
                              End
                            </button>
                          </div>
                          {/* Embedded Video Consultation - Taller for full interface */}
                          <div className="bg-gray-900 rounded-lg overflow-hidden flex-1 min-h-0" style={{ minHeight: '500px', maxHeight: '600px' }}>
                            <iframe
                              src={`https://meet.jit.si/HealthcareApp${selectedAppointmentForPrescription.id}?skipPrejoin=true&displayName=${encodeURIComponent(`Dr. ${user?.firstName} ${user?.lastName}`)}`}
                              className="w-full h-full border-0"
                              allow="camera; microphone; fullscreen; display-capture; autoplay"
                              title="Video Consultation"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Prescription Interface (3/5 width on large screens) */}
                  <div className="lg:col-span-3 flex flex-col">
                    <div className="bg-gray-50 rounded-lg p-4 flex-1 flex flex-col">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <DocumentTextIcon className="h-5 w-5 text-green-600" />
                        Prescription Management
                      </h3>
                      <div className="flex-1 min-h-0 overflow-y-auto">
                        <PrescriptionInterface
                          appointmentId={selectedAppointmentForPrescription.id}
                          onComplete={handlePrescriptionComplete}
                          isReadOnly={false}
                          userRole="doctor"
                          patientId={selectedAppointmentForPrescription.patient.id}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Regular appointments: Full-width prescription */
                <div className="h-full">
                  <div className="bg-gray-50 rounded-lg p-4 h-full flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <DocumentTextIcon className="h-5 w-5 text-green-600" />
                      Prescription Management
                    </h3>
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <PrescriptionInterface
                        appointmentId={selectedAppointmentForPrescription.id}
                        onComplete={handlePrescriptionComplete}
                        isReadOnly={false}
                        userRole="doctor"
                        patientId={selectedAppointmentForPrescription.patient.id}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
              
            {/* Fixed Footer with Complete Button */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4 sm:p-6 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => handleCompleteFromPrescription(selectedAppointmentForPrescription.id)}
                  disabled={isLoading}
                  className="btn-primary flex items-center gap-2"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  {isLoading ? 'Completing...' : 'Complete Appointment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DoctorAppointments;
