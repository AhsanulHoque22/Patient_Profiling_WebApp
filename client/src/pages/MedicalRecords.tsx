import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  DocumentTextIcon, 
  EyeIcon, 
  ArrowDownTrayIcon,
  XMarkIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface MedicalRecord {
  id: number;
  recordType: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  createdAt: string;
  doctor: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  appointment?: {
    appointmentDate: string;
  };
}

const MedicalRecords: React.FC = () => {
  const { user } = useAuth();
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Get patient ID first
  const { data: patientProfile } = useQuery({
    queryKey: ['patient-profile'],
    queryFn: async () => {
      const response = await axios.get('/patients/profile');
      return response.data.data.patient;
    },
    enabled: user?.role === 'patient',
  });

  // Fetch medical records
  const { data: records, isLoading } = useQuery<MedicalRecord[]>({
    queryKey: ['medical-records', patientProfile?.id, recordTypeFilter],
    queryFn: async () => {
      const params = recordTypeFilter !== 'all' ? `?recordType=${recordTypeFilter}` : '';
      const response = await axios.get(`/patients/${patientProfile?.id}/medical-records${params}`);
      return response.data.data.records || [];
    },
    enabled: !!patientProfile?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleViewDetails = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const handleDownload = (record: MedicalRecord) => {
    // Create a simple text representation of the record
    const content = `
MEDICAL RECORD
==============

Date: ${new Date(record.createdAt).toLocaleDateString()}
Doctor: Dr. ${record.doctor.user.firstName} ${record.doctor.user.lastName}
Type: ${record.recordType.replace('_', ' ').toUpperCase()}

Diagnosis:
${record.diagnosis || 'N/A'}

Treatment:
${record.treatment || 'N/A'}

Notes:
${record.notes || 'N/A'}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-record-${record.id}-${new Date(record.createdAt).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case 'consultation':
        return 'bg-blue-100 text-blue-800';
      case 'lab_result':
        return 'bg-green-100 text-green-800';
      case 'imaging':
        return 'bg-purple-100 text-purple-800';
      case 'prescription':
        return 'bg-orange-100 text-orange-800';
      case 'vaccination':
        return 'bg-pink-100 text-pink-800';
      case 'surgery':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecordTypeLabel = (type: string) => {
    return type.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Medical Records</h1>
        <p className="text-gray-600">View and manage your medical history and records.</p>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Medical History</h3>
          <div className="flex space-x-2">
            <select 
              value={recordTypeFilter}
              onChange={(e) => setRecordTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="all">All Records</option>
              <option value="consultation">Consultations</option>
              <option value="lab_result">Lab Results</option>
              <option value="imaging">Imaging</option>
              <option value="prescription">Prescriptions</option>
              <option value="vaccination">Vaccinations</option>
              <option value="surgery">Surgeries</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading medical records...</p>
          </div>
        ) : records && records.length > 0 ? (
          <div className="space-y-4">
            {records.map((record) => (
              <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRecordTypeColor(record.recordType)}`}>
                        {getRecordTypeLabel(record.recordType)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(record.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                      <UserIcon className="h-4 w-4" />
                      Dr. {record.doctor.user.firstName} {record.doctor.user.lastName}
                    </p>
                    {record.diagnosis && (
                      <p className="text-sm text-gray-700 mt-1">
                        <span className="font-medium">Diagnosis:</span> {record.diagnosis.length > 100 ? `${record.diagnosis.substring(0, 100)}...` : record.diagnosis}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button 
                      onClick={() => handleViewDetails(record)}
                      className="flex items-center gap-1 text-primary-600 hover:text-primary-900 text-sm px-3 py-1 rounded hover:bg-primary-50 transition-colors"
                    >
                      <EyeIcon className="h-4 w-4" />
                      View
                    </button>
                    <button 
                      onClick={() => handleDownload(record)}
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
            <p className="text-gray-500 text-lg">No medical records found</p>
            <p className="text-gray-400 text-sm mt-2">
              {recordTypeFilter !== 'all' 
                ? `No ${getRecordTypeLabel(recordTypeFilter)} records available` 
                : 'Your medical records will appear here after doctor visits'}
            </p>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Medical Record Details</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getRecordTypeColor(selectedRecord.recordType)}`}>
                      {getRecordTypeLabel(selectedRecord.recordType)}
                    </span>
                    <span className="text-sm text-gray-600">
                      {new Date(selectedRecord.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Doctor Information */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-700">
                  <UserIcon className="h-5 w-5" />
                  <div>
                    <p className="text-sm text-gray-500">Attending Physician</p>
                    <p className="font-medium">Dr. {selectedRecord.doctor.user.firstName} {selectedRecord.doctor.user.lastName}</p>
                  </div>
                </div>
              </div>

              {/* Record Details */}
              <div className="space-y-4">
                {selectedRecord.diagnosis && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Diagnosis</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedRecord.diagnosis}</p>
                  </div>
                )}

                {selectedRecord.treatment && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Treatment</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedRecord.treatment}</p>
                  </div>
                )}

                {selectedRecord.notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Notes</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedRecord.notes}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
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
