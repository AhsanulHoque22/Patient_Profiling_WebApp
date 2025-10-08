import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  BeakerIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseCircleIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

interface Medicine {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  duration: number; // in days
  doctor: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  dosages: Array<{
    id: number;
    takenAt: string;
    quantity: number;
    notes?: string;
  }>;
  reminders: Array<{
    id: number;
    time: string;
    dayOfWeek: string;
    isActive: boolean;
  }>;
}

interface MedicineStats {
  totalMedicines: number;
  activeMedicines: number;
  completedMedicines: number;
  averageAdherence: number;
  medicines: Medicine[];
}

const MedicineHistory: React.FC<{ patientId: number }> = ({ patientId }) => {
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [medicineFilter, setMedicineFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Fetch medicine history and stats
  const { data: medicineStats, isLoading } = useQuery<MedicineStats>({
    queryKey: ['medicine-stats', patientId],
    queryFn: async () => {
      const response = await axios.get(`/medicines/patients/${patientId}/stats`);
      return response.data.data;
    },
    enabled: !!patientId,
  });

  const calculateAdherencePercentage = (medicine: Medicine): number => {
    if (!medicine.dosages || medicine.dosages.length === 0) {
      return 0;
    }

    let expectedDosages = 0;
    
    if (medicine.endDate) {
      // For completed medicines, calculate based on duration
      const startDate = new Date(medicine.startDate);
      const endDate = new Date(medicine.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      
      // Parse frequency to get daily dosage count
      const frequency = medicine.frequency.toLowerCase();
      let dailyDosages = 1;
      
      if (frequency.includes('twice') || frequency.includes('2 times')) {
        dailyDosages = 2;
      } else if (frequency.includes('three times') || frequency.includes('3 times')) {
        dailyDosages = 3;
      } else if (frequency.includes('four times') || frequency.includes('4 times')) {
        dailyDosages = 4;
      }
      
      expectedDosages = totalDays * dailyDosages;
    } else if (medicine.isActive) {
      // For active medicines, calculate based on days since start
      const startDate = new Date(medicine.startDate);
      const now = new Date();
      const totalDays = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      
      // Parse frequency to get daily dosage count
      const frequency = medicine.frequency.toLowerCase();
      let dailyDosages = 1;
      
      if (frequency.includes('twice') || frequency.includes('2 times')) {
        dailyDosages = 2;
      } else if (frequency.includes('three times') || frequency.includes('3 times')) {
        dailyDosages = 3;
      } else if (frequency.includes('four times') || frequency.includes('4 times')) {
        dailyDosages = 4;
      }
      
      expectedDosages = totalDays * dailyDosages;
    }
    
    const actualDosages = medicine.dosages.length;
    return Math.min(100, Math.round((actualDosages / Math.max(1, expectedDosages)) * 100));
  };

  const getAdherenceColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-600 bg-green-100';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getMedicineStatus = (medicine: Medicine): { label: string; color: string; icon: React.ReactNode } => {
    if (!medicine.isActive && medicine.endDate) {
      return {
        label: 'Completed',
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircleIcon className="h-4 w-4" />
      };
    } else if (!medicine.isActive && !medicine.endDate) {
      return {
        label: 'Discontinued',
        color: 'bg-red-100 text-red-800',
        icon: <XCircleIcon className="h-4 w-4" />
      };
    } else {
      return {
        label: 'Active',
        color: 'bg-blue-100 text-blue-800',
        icon: <PauseCircleIcon className="h-4 w-4" />
      };
    }
  };

  const formatDuration = (days: number): string => {
    if (days >= 365) {
      const years = Math.floor(days / 365);
      const remainingDays = days % 365;
      return `${years} year${years > 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} days` : ''}`;
    } else if (days >= 30) {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      return `${months} month${months > 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} days` : ''}`;
    } else {
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  };

  const handleViewDetails = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setShowDetailModal(true);
  };

  // Filter medicines based on selected filter
  const filteredMedicines = medicineStats?.medicines.filter((medicine) => {
    if (medicineFilter === 'all') return true;
    if (medicineFilter === 'active') return medicine.isActive;
    if (medicineFilter === 'completed') return !medicine.isActive && medicine.endDate;
    return true;
  }) || [];

  // Calculate filtered statistics
  const filteredStats = {
    totalMedicines: filteredMedicines.length,
    activeMedicines: filteredMedicines.filter(m => m.isActive).length,
    completedMedicines: filteredMedicines.filter(m => !m.isActive && m.endDate).length,
    averageAdherence: filteredMedicines.length > 0 
      ? Math.round(filteredMedicines.reduce((sum, m) => sum + calculateAdherencePercentage(m), 0) / filteredMedicines.length)
      : 0
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading medicine history...</p>
      </div>
    );
  }

  if (!medicineStats || medicineStats.medicines.length === 0) {
    return (
      <div className="text-center py-12">
        <BeakerIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No medicine history found</p>
        <p className="text-gray-400 text-sm mt-2">
          Your medicine history will appear here after your doctor prescribes medications
        </p>
      </div>
    );
  }

  if (filteredMedicines.length === 0) {
    return (
      <div className="space-y-6">
        {/* Filter Section */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Medicine History</h3>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-gray-500" />
            <select 
              value={medicineFilter}
              onChange={(e) => setMedicineFilter(e.target.value as 'all' | 'active' | 'completed')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="all">All Medicines</option>
              <option value="active">Active Medicines</option>
              <option value="completed">Completed Medicines</option>
            </select>
          </div>
        </div>

        <div className="text-center py-12">
          <BeakerIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            No {medicineFilter === 'all' ? '' : medicineFilter} medicines found
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {medicineFilter === 'active' && 'You have no active medications at the moment'}
            {medicineFilter === 'completed' && 'You have no completed medication courses'}
            {medicineFilter === 'all' && 'Your medicine history will appear here after your doctor prescribes medications'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Medicine History</h3>
          <p className="text-sm text-gray-600">
            Showing {filteredStats.totalMedicines} of {medicineStats.totalMedicines} medicines
            {medicineFilter !== 'all' && ` (${medicineFilter} only)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-4 w-4 text-gray-500" />
          <select 
            value={medicineFilter}
            onChange={(e) => setMedicineFilter(e.target.value as 'all' | 'active' | 'completed')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="all">All Medicines</option>
            <option value="active">Active Medicines</option>
            <option value="completed">Completed Medicines</option>
          </select>
        </div>
      </div>

      {/* Quick Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMedicineFilter('all')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            medicineFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({medicineStats.totalMedicines})
        </button>
        <button
          onClick={() => setMedicineFilter('active')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            medicineFilter === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Active ({medicineStats.activeMedicines})
        </button>
        <button
          onClick={() => setMedicineFilter('completed')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            medicineFilter === 'completed'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Completed ({medicineStats.completedMedicines})
        </button>
      </div>

      {/* Filter Status Indicator */}
      {medicineFilter !== 'all' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Filtered by: {medicineFilter === 'active' ? 'Active Medicines' : 'Completed Medicines'}
            </span>
            <button
              onClick={() => setMedicineFilter('all')}
              className="text-blue-600 hover:text-blue-800 text-sm underline ml-2"
            >
              Show All
            </button>
          </div>
        </div>
      )}

      {/* Medicine Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <BeakerIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total Medicines</p>
              <p className="text-2xl font-bold text-blue-900">{medicineStats.totalMedicines}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Active</p>
              <p className="text-2xl font-bold text-green-900">{medicineStats.activeMedicines}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center">
            <XCircleIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Completed</p>
              <p className="text-2xl font-bold text-purple-900">{medicineStats.completedMedicines}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-600">Avg. Adherence</p>
              <p className="text-2xl font-bold text-yellow-900">{medicineStats.averageAdherence}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Medicine History List */}
      <div className="space-y-4">
        {filteredMedicines.map((medicine) => {
          const adherence = calculateAdherencePercentage(medicine);
          const status = getMedicineStatus(medicine);
          const duration = medicine.endDate 
            ? Math.ceil((new Date(medicine.endDate).getTime() - new Date(medicine.startDate).getTime()) / (24 * 60 * 60 * 1000))
            : Math.ceil((Date.now() - new Date(medicine.startDate).getTime()) / (24 * 60 * 60 * 1000));

          return (
            <div key={medicine.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getAdherenceColor(adherence)}`}>
                      {adherence}% Adherence
                    </span>
                    {!medicine.isActive && medicine.endDate && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        Course Completed
                      </span>
                    )}
                  </div>
                  
                  <h4 className="font-medium text-gray-900 mb-1">{medicine.name}</h4>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Dosage:</span> {medicine.dosage}</p>
                    <p><span className="font-medium">Frequency:</span> {medicine.frequency}</p>
                    <p className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Started: {new Date(medicine.startDate).toLocaleDateString()}</span>
                    </p>
                    {medicine.endDate && (
                      <p className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>Ended: {new Date(medicine.endDate).toLocaleDateString()}</span>
                      </p>
                    )}
                    <p><span className="font-medium">Duration:</span> {formatDuration(duration)}</p>
                    <p><span className="font-medium">Prescribed by:</span> Dr. {medicine.doctor.user.firstName} {medicine.doctor.user.lastName}</p>
                  </div>

                  {medicine.instructions && (
                    <p className="text-sm text-gray-700 mt-2">
                      <span className="font-medium">Instructions:</span> {medicine.instructions}
                    </p>
                  )}

                  {/* Completion Summary for completed medicines */}
                  {!medicine.isActive && medicine.endDate && (
                    <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-semibold text-purple-800">Course Completion Summary</h5>
                          <p className="text-xs text-purple-600 mt-1">
                            Completed on {new Date(medicine.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getAdherenceColor(adherence).split(' ')[0]}`}>
                            {adherence}%
                          </div>
                          <p className="text-xs text-purple-600">Final Adherence</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-purple-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              adherence >= 80 ? 'bg-green-500' : 
                              adherence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${adherence}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-purple-600 mt-1">
                          {adherence >= 80 ? 'Excellent adherence!' : 
                           adherence >= 60 ? 'Good adherence' : 'Room for improvement'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button 
                    onClick={() => handleViewDetails(medicine)}
                    className="text-primary-600 hover:text-primary-900 text-sm px-3 py-1 rounded hover:bg-primary-50 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Medicine Detail Modal */}
      {showDetailModal && selectedMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Medicine Details: {selectedMedicine.name}
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Dosage</label>
                    <p className="text-gray-900">{selectedMedicine.dosage}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Frequency</label>
                    <p className="text-gray-900">{selectedMedicine.frequency}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Start Date</label>
                    <p className="text-gray-900">{new Date(selectedMedicine.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">End Date</label>
                    <p className="text-gray-900">
                      {selectedMedicine.endDate 
                        ? new Date(selectedMedicine.endDate).toLocaleDateString() 
                        : 'Ongoing'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Prescribed by</label>
                    <p className="text-gray-900">
                      Dr. {selectedMedicine.doctor.user.firstName} {selectedMedicine.doctor.user.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Adherence</label>
                    <p className={`px-2 py-1 rounded-full text-sm font-medium inline-block ${getAdherenceColor(calculateAdherencePercentage(selectedMedicine))}`}>
                      {calculateAdherencePercentage(selectedMedicine)}%
                    </p>
                  </div>
                </div>

                {/* Instructions */}
                {selectedMedicine.instructions && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Instructions</label>
                    <p className="text-gray-900 mt-1">{selectedMedicine.instructions}</p>
                  </div>
                )}

                {/* Dosage History */}
                <div>
                  <label className="text-sm font-medium text-gray-500">Dosage History</label>
                  {selectedMedicine.dosages.length > 0 ? (
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                      {selectedMedicine.dosages.map((dosage) => (
                        <div key={dosage.id} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              {new Date(dosage.takenAt).toLocaleDateString()} at {new Date(dosage.takenAt).toLocaleTimeString()}
                            </span>
                            <span className="text-sm text-gray-600">Quantity: {dosage.quantity}</span>
                          </div>
                          {dosage.notes && (
                            <p className="text-sm text-gray-600 mt-1">{dosage.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm mt-2">No dosage history recorded</p>
                  )}
                </div>

                {/* Reminders */}
                <div>
                  <label className="text-sm font-medium text-gray-500">Reminders</label>
                  {selectedMedicine.reminders.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {selectedMedicine.reminders.map((reminder) => (
                        <div key={reminder.id} className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              {reminder.time} - {reminder.dayOfWeek}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              reminder.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {reminder.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm mt-2">No reminders set</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
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

export default MedicineHistory;
