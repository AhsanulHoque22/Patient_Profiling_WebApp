import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CalendarIcon, ClockIcon, UserIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({
    doctorId: '',
    appointmentDate:'',
    timeBlock: '',
    type: 'in_person',
    reason: '',
    symptoms: ''
  });
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableTimeBlocks, setAvailableTimeBlocks] = useState<Array<{value: string, label: string}>>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');

  // Fetch appointments using React Query for automatic refetching
  const { data: appointmentsData, refetch: refetchAppointments } = useQuery({
    queryKey: ['patient-appointments', user?.id],
    queryFn: async () => {
      const response = await axios.get('/appointments');
      return response.data.data.appointments || [];
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Refetch every 5 seconds to get real-time updates
  });

  // Filter and sort appointments
  const appointments = (appointmentsData || [])
    .filter((apt: any) => {
      if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
      if (typeFilter !== 'all' && apt.type !== typeFilter) return false;
      if (doctorFilter !== 'all' && apt.doctorId.toString() !== doctorFilter) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      // Sort by date in descending order (newest first)
      const dateA = new Date(a.appointmentDate).getTime();
      const dateB = new Date(b.appointmentDate).getTime();
      return dateB - dateA;
    });

  // Get unique doctors from appointments for filter dropdown
  const uniqueDoctors = Array.from(
    new Map(
      (appointmentsData || [])
        .filter((apt: any) => apt.doctor)
        .map((apt: any) => [
          apt.doctorId,
          {
            id: apt.doctorId,
            name: `Dr. ${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`,
            specialization: apt.doctor.specialization
          }
        ])
    ).values()
  );

  // Get available time blocks for selected doctor
  const getAvailableTimeBlocks = (doctorId: string) => {
    const doctor = doctors.find(d => d.id.toString() === doctorId);
    if (!doctor || !doctor.chamberTimes) {
      return [];
    }

    const times: Array<{value: string, label: string}> = [];
    const chamberTimes = doctor.chamberTimes;

    // Get the day of the week for the selected appointment date
    const selectedDate = bookingForm.appointmentDate ? new Date(bookingForm.appointmentDate) : new Date();
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Check if doctor has chamber times for this day
    if (chamberTimes[dayOfWeek] && Array.isArray(chamberTimes[dayOfWeek])) {
      chamberTimes[dayOfWeek].forEach((time: string) => {
        times.push({
          value: time,
          label: `${time} (${dayOfWeek})`
        });
      });
    }

    // If no times for specific day, show all available times
    if (times.length === 0) {
      Object.keys(chamberTimes).forEach(day => {
        if (Array.isArray(chamberTimes[day])) {
          chamberTimes[day].forEach((time: string) => {
            times.push({
              value: time,
              label: `${time} (${day})`
            });
          });
        }
      });
    }

    return times;
  };

  // Fetch doctors for booking
  const fetchDoctors = async () => {
    try {
      const response = await axios.get('/doctors');
      // Filter doctors who have chamber times set
      const doctorsWithChamberTimes = response.data.data.doctors.filter((doctor: any) => 
        doctor.chamberTimes && Object.keys(doctor.chamberTimes).length > 0
      );
      setDoctors(doctorsWithChamberTimes);
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    }
  };

  // Get patient ID for the current user
  const getPatientId = async () => {
    try {
      const response = await axios.get('/patients/profile');
      return response.data.data.patient.id;
    } catch (error) {
      console.error('Failed to get patient ID:', error);
      return null;
    }
  };


  // Handle booking appointment
  const handleBookingSubmit = async () => {
    setIsLoading(true);
    try {
      const patientId = await getPatientId();
      if (!patientId) {
        toast.error('Unable to identify patient profile');
        return;
      }

      const appointmentData = {
        ...bookingForm,
        patientId: patientId,
        duration: 180 // 3 hours for chamber blocks
      };

      await axios.post('/appointments', appointmentData);
      toast.success('Appointment request sent successfully! Waiting for doctor approval.');
      setShowBookingModal(false);
      // Reset form
      setBookingForm({
        doctorId: '',
        appointmentDate: '',
        timeBlock: '',
        type: 'in_person',
        reason: '',
        symptoms: ''
      });
      // Refresh appointments list and dashboard stats
      await refetchAppointments();
      queryClient.invalidateQueries({ queryKey: ['patient-dashboard-stats'] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to book appointment');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle view appointment
  const handleViewAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowViewModal(true);
  };

  // Handle cancel appointment
  const handleCancelAppointment = async (appointmentId: number) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await axios.put(`/appointments/${appointmentId}/cancel`);
        toast.success('Appointment cancelled successfully!');
        // Refresh appointments list and dashboard stats
        await refetchAppointments();
        queryClient.invalidateQueries({ queryKey: ['patient-dashboard-stats'] });
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to cancel appointment');
      }
    }
  };

  // Load appointments when component mounts
  useEffect(() => {
    // Check if doctorId is in URL params and open booking modal
    const doctorId = searchParams.get('doctorId');
    if (doctorId) {
      setBookingForm(prev => ({ ...prev, doctorId }));
      setShowBookingModal(true);
      fetchDoctors();
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Appointments</h1>
        <p className="text-gray-600">Manage your appointments and schedule new ones.</p>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">My Appointments</h3>
          <button 
            onClick={() => {
              setShowBookingModal(true);
              fetchDoctors();
            }}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Book New Appointment
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Doctor:</label>
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm min-w-[200px]"
              >
                <option value="all">All Doctors</option>
                {uniqueDoctors.map((doctor: any) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} {doctor.specialization && `(${doctor.specialization})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="requested">Requested</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
              >
                <option value="all">All Types</option>
                <option value="in_person">In Person</option>
                <option value="telemedicine">Telemedicine</option>
                <option value="follow_up">Follow Up</option>
              </select>
            </div>

            {(statusFilter !== 'all' || typeFilter !== 'all' || doctorFilter !== 'all') && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setDoctorFilter('all');
                }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
          
          <div className="text-sm text-gray-600">
            Showing {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
            {(statusFilter !== 'all' || typeFilter !== 'all' || doctorFilter !== 'all') && ' (filtered)'}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
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
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No appointments scheduled. Book your first appointment today!
                  </td>
                </tr>
              ) : (
                appointments.map((appointment: any) => (
                  <tr key={appointment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>{new Date(appointment.appointmentDate).toLocaleDateString()}</div>
                        <div className="text-gray-500">Serial #{appointment.serialNumber} - {appointment.appointmentTime}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Dr. {appointment.doctor?.user?.firstName} {appointment.doctor?.user?.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {appointment.type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        appointment.status === 'requested' ? 'bg-yellow-100 text-yellow-800' :
                        appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'in_progress' ? 'bg-purple-100 text-purple-800' :
                        appointment.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.status === 'in_progress' ? 'In Progress' : 
                         appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button 
                        onClick={() => handleViewAppointment(appointment)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        View
                      </button>
                      {appointment.status === 'scheduled' || appointment.status === 'confirmed' ? (
                        <button 
                          onClick={() => handleCancelAppointment(appointment.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel

                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Book New Appointment</h2>
              <button 
                onClick={() => setShowBookingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleBookingSubmit(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Doctor Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor</label>
                  <select
                    value={bookingForm.doctorId}
                    onChange={(e) => {
                      setBookingForm({...bookingForm, doctorId: e.target.value, timeBlock: ''});
                      setAvailableTimeBlocks(getAvailableTimeBlocks(e.target.value));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Choose a doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.user.firstName} {doctor.user.lastName} - {doctor.specialization}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Appointment Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={bookingForm.appointmentDate}
                    onChange={(e) => {
                      setBookingForm({...bookingForm, appointmentDate: e.target.value, timeBlock: ''});
                      setAvailableTimeBlocks(getAvailableTimeBlocks(bookingForm.doctorId));
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                {/* Time Block Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Available Chamber Times</label>
                  <select
                    value={bookingForm.timeBlock}
                    onChange={(e) => setBookingForm({...bookingForm, timeBlock: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                    disabled={!bookingForm.doctorId || !bookingForm.appointmentDate}
                  >
                    <option value="">
                      {!bookingForm.doctorId ? 'Please select a doctor first' : 
                       !bookingForm.appointmentDate ? 'Please select a date first' : 
                       'Choose an available chamber time'}
                    </option>
                    {availableTimeBlocks.map((block) => (
                      <option key={block.value} value={block.value}>
                        {block.label}
                      </option>
                    ))}
                  </select>
                  {bookingForm.doctorId && bookingForm.appointmentDate && availableTimeBlocks.length === 0 && (
                    <p className="text-sm text-orange-600 mt-1">
                      No chamber times available for the selected doctor on this day.
                    </p>
                  )}
                </div>

                {/* Appointment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type</label>
                  <select
                    value={bookingForm.type}
                    onChange={(e) => setBookingForm({...bookingForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="in_person">In-Person</option>
                    <option value="telemedicine">Telemedicine</option>
                    <option value="follow_up">Follow-up</option>
                  </select>
                </div>
              </div>

              {/* Reason */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1"> Reason for Visit</label>
                <input
                  type="text"
                  value={bookingForm.reason}
                  onChange={(e) => setBookingForm({...bookingForm, reason: e.target.value})}
                  placeholder="Brief reason for the appointment"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Symptoms */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms</label>
                <textarea
                  value={bookingForm.symptoms}
                  onChange={(e) => setBookingForm({...bookingForm, symptoms: e.target.value})}
                  placeholder="Describe any symptoms or concerns"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? 'Booking...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Appointment Modal */}
      {showViewModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Appointment Details</h2>
              <button 
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Appointment Serial & Date */}
              <div className="bg-primary-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-primary-900">
                      Serial #{selectedAppointment.serialNumber}
                    </h3>
                    <p className="text-primary-700">
                      {new Date(selectedAppointment.appointmentDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-primary-900">
                      {selectedAppointment.appointmentTime}
                    </p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedAppointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      selectedAppointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      selectedAppointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      selectedAppointment.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Doctor Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Doctor</h4>
                  <p className="text-gray-700">
                    Dr. {selectedAppointment.doctor?.user?.firstName} {selectedAppointment.doctor?.user?.lastName}
                  </p>
                  <p className="text-sm text-gray-600 capitalize">
                    {selectedAppointment.doctor?.specialization?.replace('_', ' ')}
                  </p>
                </div>

                {/* Appointment Type */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Type</h4>
                  <p className="text-gray-700 capitalize">
                    {selectedAppointment.type.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Reason */}
              {selectedAppointment.reason && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Reason for Appointment</h4>
                  <p className="text-blue-800">{selectedAppointment.reason}</p>
                </div>
              )}

              {/* Symptoms */}
              {selectedAppointment.symptoms && (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-2">Symptoms</h4>
                  <p className="text-orange-800">{selectedAppointment.symptoms}</p>
                </div>
              )}

              {/* Notes */}
              {selectedAppointment.notes && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Doctor's Notes</h4>
                  <p className="text-green-800">{selectedAppointment.notes}</p>
                </div>
              )}

              {/* Diagnosis */}
              {selectedAppointment.diagnosis && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Diagnosis</h4>
                  <p className="text-purple-800">{selectedAppointment.diagnosis}</p>
                </div>
              )}

              {/* Prescription */}
              {selectedAppointment.prescription && (
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-indigo-900 mb-2">Prescription</h4>
                  <p className="text-indigo-800">{selectedAppointment.prescription}</p>
                </div>
              )}
            </div>

            {/* Close button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowViewModal(false)}
                className="btn-outline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
