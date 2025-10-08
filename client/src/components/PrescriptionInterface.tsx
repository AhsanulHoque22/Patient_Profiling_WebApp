import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '../services/paymentService';
import { 
  PlusIcon, 
  XMarkIcon, 
  CheckIcon, 
  DocumentTextIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface PrescriptionInterfaceProps {
  appointmentId: number;
  onComplete: () => void;
  isReadOnly?: boolean;
  userRole?: 'doctor' | 'patient' | 'admin';
  patientId?: number;
}

interface PrescriptionFormData {
  medicines?: string;
  symptoms?: string;
  diagnosis?: string;
  suggestions?: string;
  tests?: string;
  reports?: string;
  exercises?: string;
  dietaryChanges?: string;
}

interface Medicine {
  name: string;
  dosage: string;
  unit: 'mg' | 'ml';
  type: 'tablet' | 'syrup';
  morning: number;
  lunch: number;
  dinner: number;
  mealTiming: 'before' | 'after';
  duration: number; // Changed to number for days
  notes: string;
}

interface Symptom {
  id: string;
  description: string;
}

interface Diagnosis {
  id: string;
  description: string;
  date: string;
}

interface Test {
  id: string;
  name: string;
  description: string;
  status: 'ordered' | 'approved' | 'done' | 'reported';
  testId?: number; // Reference to lab test database
  category?: string;
  price?: number;
}

interface FollowUp {
  id: string;
  description: string;
}

interface EmergencyInstruction {
  id: string;
  description: string;
}

interface ExistingMedicine {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  doctor: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

interface TestReport {
  id: string;
  originalName: string;
  path: string;
  uploadedAt: string;
  testName?: string;
}


const PrescriptionInterface: React.FC<PrescriptionInterfaceProps> = ({ 
  appointmentId, 
  onComplete,
  isReadOnly = false,
  userRole = 'doctor',
  patientId
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [emergencyInstructions, setEmergencyInstructions] = useState<EmergencyInstruction[]>([]);
  const [existingMedicines, setExistingMedicines] = useState<ExistingMedicine[]>([]);
  const [testReports, setTestReports] = useState<TestReport[]>([]);
  const [showAllPrescriptions, setShowAllPrescriptions] = useState(false);
  const [activeTab, setActiveTab] = useState<'medicines' | 'symptoms' | 'diagnosis' | 'suggestions' | 'tests' | 'reports'>('medicines');
  const [testSearchTerm, setTestSearchTerm] = useState('');
  const [showTestSearch, setShowTestSearch] = useState(false);

  const form = useForm<PrescriptionFormData>({
    defaultValues: {
      medicines: '',
      symptoms: '',
      diagnosis: '',
      suggestions: '',
      tests: '',
      reports: '',
      exercises: '',
      dietaryChanges: ''
    }
  });

  // Fetch available lab tests for search
  const { data: availableLabTests, isLoading: labTestsLoading } = useQuery({
    queryKey: ['lab-tests', testSearchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (testSearchTerm) {
        params.append('search', testSearchTerm);
      }
      console.log('Fetching lab tests with params:', params.toString());
      const response = await axios.get(`/lab-tests/tests?${params}`);
      console.log('Lab tests API response:', response.data);
      // The API returns data in nested structure: data.tests and data.groupedTests
      const tests = response.data.data?.tests || [];
      console.log('Available lab tests:', tests.length, tests);
      return tests;
    },
    enabled: showTestSearch, // Only fetch when search is shown
  });

  // Fetch appointment data with patient information
  const { data: appointmentData } = useQuery({
    queryKey: ['appointment-patient-data', appointmentId],
    queryFn: async () => {
      const response = await axios.get(`/appointments/${appointmentId}`);
      return response.data.data.appointment;
    },
    enabled: !!appointmentId,
  });

  // Fetch patient's lab test orders with 'reported' status
  const { data: patientLabOrders, isLoading: labOrdersLoading, error: labOrdersError } = useQuery({
    queryKey: ['patient-lab-orders-reported', patientId || appointmentData?.patient?.id],
    queryFn: async () => {
      const currentPatientId = patientId || appointmentData?.patient?.id;
      console.log('Fetching lab reports for patient:', currentPatientId);
      try {
        // Use the new patient-specific endpoint for doctors
        const response = await axios.get(`/lab-tests/patients/${currentPatientId}/lab-reports`, {
          params: {
            status: 'reported', // Get only reported tests
            limit: 100
          }
        });
        console.log('Lab reports API response:', response.data);
        return response.data.data.orders || [];
      } catch (error) {
        console.error('Error fetching lab reports:', error);
        throw error;
      }
    },
    enabled: !!(patientId || appointmentData?.patient?.id) && userRole === 'doctor',
  });

  // Fetch patient's prescription lab tests with 'reported' status
  const { data: patientPrescriptionLabTests, isLoading: prescriptionLabTestsLoading, error: prescriptionLabTestsError } = useQuery({
    queryKey: ['patient-prescription-lab-tests-reported', patientId || appointmentData?.patient?.id],
    queryFn: async () => {
      const currentPatientId = patientId || appointmentData?.patient?.id;
      console.log('Fetching prescription lab tests for patient:', currentPatientId);
      try {
        // Use the new patient-specific endpoint for doctors
        const response = await axios.get(`/lab-tests/patients/${currentPatientId}/prescription-lab-tests`, {
          params: {
            status: 'reported', // Get only reported tests
            limit: 100
          }
        });
        console.log('Prescription lab tests API response:', response.data);
        return response.data.data.prescriptions || [];
      } catch (error) {
        console.error('Error fetching prescription lab tests:', error);
        throw error;
      }
    },
    enabled: !!(patientId || appointmentData?.patient?.id) && userRole === 'doctor',
  });


  // Load existing prescription data
  useEffect(() => {
    const loadPrescription = async () => {
      try {
        const response = await axios.get(`/prescriptions/appointment/${appointmentId}`);
        const prescription = response.data.data.prescription;
        
        if (prescription) {
          form.setValue('symptoms', prescription.symptoms || '');
          form.setValue('diagnosis', prescription.diagnosis || '');
          form.setValue('suggestions', prescription.suggestions || '');
          
          // Parse medicines and tests from JSON strings
          if (prescription.medicines) {
            try {
              const medicinesData = JSON.parse(prescription.medicines);
              setMedicines(medicinesData);
            } catch {
              // If not JSON, treat as plain text
              form.setValue('medicines', prescription.medicines);
            }
          }
          
          if (prescription.tests) {
            try {
              const testsData = JSON.parse(prescription.tests);
              setTests(testsData);
            } catch {
              // If not JSON, treat as plain text
              form.setValue('tests', prescription.tests);
            }
          }
        }
      } catch (error) {
        console.log('No existing prescription found');
      }
    };

    loadPrescription();
  }, [appointmentId, form]);

  // Load existing medicines for the patient
  useEffect(() => {
    const loadExistingMedicines = async () => {
      if (patientId && userRole === 'doctor') {
        try {
          const response = await axios.get(`/medicines/doctors/patients/${patientId}/medicines?status=active`);
          setExistingMedicines(response.data.data || []);
        } catch (error) {
          console.log('No existing medicines found');
        }
      }
    };

    loadExistingMedicines();
  }, [patientId, userRole]);

  // Load test reports for the patient
  useEffect(() => {
    const loadTestReports = async () => {
      if (patientId && userRole === 'doctor') {
        try {
          // Fetch prescription lab tests
          const prescriptionResponse = await axios.get(`/admin/prescription-lab-tests?patientId=${patientId}`);
          const prescriptionTests = prescriptionResponse.data.data || [];
          
          // Fetch regular lab orders
          const labOrdersResponse = await axios.get(`/admin/lab-orders?patientId=${patientId}`);
          const labOrders = labOrdersResponse.data.data || [];
          
          // Combine and extract reports
          const allReports: TestReport[] = [];
          
          prescriptionTests.forEach((test: any) => {
            if (test.testReports && test.testReports.length > 0) {
              test.testReports.forEach((report: any) => {
                allReports.push({
                  id: report.id,
                  originalName: report.originalName,
                  path: report.path,
                  uploadedAt: report.uploadedAt,
                  testName: test.name
                });
              });
            }
          });
          
          labOrders.forEach((order: any) => {
            if (order.testReports && order.testReports.length > 0) {
              order.testReports.forEach((report: any) => {
                allReports.push({
                  id: report.id,
                  originalName: report.originalName,
                  path: report.path,
                  uploadedAt: report.uploadedAt,
                  testName: order.testDetails?.[0]?.name || 'Lab Test'
                });
              });
            }
          });
          
          setTestReports(allReports);
        } catch (error) {
          console.log('No test reports found');
        }
      }
    };

    loadTestReports();
  }, [patientId, userRole]);

  const addMedicine = () => {
    setMedicines([...medicines, { 
      name: '', 
      dosage: '', 
      unit: 'mg',
      type: 'tablet',
      morning: 0, 
      lunch: 0, 
      dinner: 0, 
      mealTiming: 'after', 
      duration: 7, // Default to 7 days
      notes: '' 
    }]);
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const updateMedicine = (index: number, field: keyof Medicine, value: any) => {
    const updated = medicines.map((medicine, i) =>
      i === index ? { ...medicine, [field]: value } : medicine
    );
    setMedicines(updated);
  };

  const discontinueMedicine = async (medicineId: number) => {
    // Use toast to show confirmation
    const confirmed = window.confirm('Are you sure you want to discontinue this medicine?');
    if (!confirmed) {
      return;
    }

    try {
      await axios.post(`/medicines/medicines/${medicineId}/discontinue`, {
        reason: 'Doctor discontinued during appointment',
        notes: 'Discontinued during prescription review'
      });
      
      toast.success('Medicine discontinued successfully');
      
      // Refresh existing medicines list
      if (patientId) {
        const response = await axios.get(`/medicines/doctors/patients/${patientId}/medicines?status=active`);
        setExistingMedicines(response.data.data || []);
      }
    } catch (error) {
      toast.error('Failed to discontinue medicine');
      console.error('Error discontinuing medicine:', error);
    }
  };

  const downloadReport = async (report: TestReport) => {
    try {
      const response = await axios.get(`/admin/test-reports/${report.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', report.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download report');
      console.error('Error downloading report:', error);
    }
  };

  const addSymptom = () => {
    setSymptoms([...symptoms, { 
      id: Date.now().toString(), 
      description: '' 
    }]);
  };

  const removeSymptom = (id: string) => {
    setSymptoms(symptoms.filter(s => s.id !== id));
  };

  const updateSymptom = (id: string, description: string) => {
    setSymptoms(symptoms.map(s => s.id === id ? { ...s, description } : s));
  };

  const addDiagnosis = () => {
    setDiagnoses([...diagnoses, { 
      id: Date.now().toString(), 
      description: '', 
      date: new Date().toISOString().split('T')[0] 
    }]);
  };

  const removeDiagnosis = (id: string) => {
    setDiagnoses(diagnoses.filter(d => d.id !== id));
  };

  const updateDiagnosis = (id: string, field: keyof Diagnosis, value: string) => {
    setDiagnoses(diagnoses.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const addTest = () => {
    setTests([...tests, { 
      id: Date.now().toString(), 
      name: '', 
      description: '', 
      status: 'ordered',
      category: 'Others'
    }]);
  };

  const addTestFromSearch = (labTest: any) => {
    const newTest: Test = {
      id: Date.now().toString(),
      name: labTest.name,
      description: labTest.description,
      status: 'ordered',
      testId: labTest.id,
      category: labTest.category,
      price: labTest.price
    };
    setTests([...tests, newTest]);
    setShowTestSearch(false);
    setTestSearchTerm('');
    toast.success(`Added ${labTest.name} to tests`);
  };


  const removeTest = (id: string) => {
    setTests(tests.filter(t => t.id !== id));
  };

  const updateTest = (id: string, field: keyof Test, value: any) => {
    setTests(tests.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const addFollowUp = () => {
    setFollowUps([...followUps, { 
      id: Date.now().toString(), 
      description: '' 
    }]);
  };

  const removeFollowUp = (id: string) => {
    setFollowUps(followUps.filter(f => f.id !== id));
  };

  const updateFollowUp = (id: string, description: string) => {
    setFollowUps(followUps.map(f => f.id === id ? { ...f, description } : f));
  };

  const addEmergencyInstruction = () => {
    setEmergencyInstructions([...emergencyInstructions, { 
      id: Date.now().toString(), 
      description: '' 
    }]);
  };

  const removeEmergencyInstruction = (id: string) => {
    setEmergencyInstructions(emergencyInstructions.filter(e => e.id !== id));
  };

  const updateEmergencyInstruction = (id: string, description: string) => {
    setEmergencyInstructions(emergencyInstructions.map(e => e.id === id ? { ...e, description } : e));
  };

  const onSubmit = async (data: PrescriptionFormData) => {
    setIsLoading(true);
    try {
      const prescriptionData = {
        appointmentId,
        medicines: medicines.length > 0 ? JSON.stringify(medicines) : data.medicines,
        symptoms: symptoms.length > 0 ? JSON.stringify(symptoms) : data.symptoms,
        diagnosis: diagnoses.length > 0 ? JSON.stringify(diagnoses) : data.diagnosis,
        suggestions: JSON.stringify({
          exercises: data.exercises,
          dietaryChanges: data.dietaryChanges,
          lifestyleModifications: data.suggestions
        }),
        tests: tests.length > 0 ? JSON.stringify(tests) : data.tests,
        testReports: data.reports
      };

      await axios.post(`/prescriptions/appointment/${appointmentId}`, prescriptionData);
      toast.success('Prescription saved successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save prescription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Save current form data first
      const formData = form.getValues();
      const prescriptionData = {
        appointmentId,
        medicines: medicines.length > 0 ? JSON.stringify(medicines) : formData.medicines,
        symptoms: symptoms.length > 0 ? JSON.stringify(symptoms) : formData.symptoms,
        diagnosis: diagnoses.length > 0 ? JSON.stringify(diagnoses) : formData.diagnosis,
        suggestions: JSON.stringify({
          followUps,
          emergencyInstructions,
          exercises: formData.suggestions
        }),
        tests: tests.length > 0 ? JSON.stringify(tests) : formData.tests,
        testReports: formData.reports
      };

      await axios.post(`/prescriptions/appointment/${appointmentId}`, prescriptionData);
      
      // Complete the prescription
      await axios.put(`/prescriptions/appointment/${appointmentId}/complete`);
      
      toast.success('Appointment completed successfully!');
      onComplete();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'medicines', name: 'Medicines', icon: DocumentTextIcon },
    { id: 'symptoms', name: 'Symptoms', icon: ClipboardDocumentListIcon },
    { id: 'diagnosis', name: 'Diagnosis', icon: BeakerIcon },
    { id: 'suggestions', name: 'Suggestions', icon: CheckIcon },
    { id: 'tests', name: 'Tests Ordered', icon: BeakerIcon },
    { id: 'reports', name: 'Reports', icon: DocumentTextIcon }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Prescription Management</h3>
        <p className="text-sm text-gray-600">Record patient symptoms, diagnosis, and treatment plan</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Medicines Tab */}
        {activeTab === 'medicines' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-md font-medium text-gray-900">Medicines</h4>
            </div>

            {/* Existing Medicines Section */}
            {userRole === 'doctor' && existingMedicines.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-gray-700">Current Active Medicines</h5>
                {existingMedicines.map((medicine) => (
                  <div key={medicine.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h6 className="font-medium text-gray-900">{medicine.name}</h6>
                        <p className="text-sm text-gray-600">
                          {medicine.dosage} • {medicine.frequency}
                        </p>
                        <p className="text-xs text-gray-500">
                          Prescribed by Dr. {medicine.doctor.user.firstName} {medicine.doctor.user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Started: {new Date(medicine.startDate).toLocaleDateString()}
                          {medicine.endDate && ` • Ends: ${new Date(medicine.endDate).toLocaleDateString()}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => discontinueMedicine(medicine.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                        title="Discontinue Medicine"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    {medicine.instructions && (
                      <p className="text-sm text-gray-700">{medicine.instructions}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* New Medicines Section */}
            <div className="flex justify-between items-center mt-6">
              <h5 className="text-sm font-medium text-gray-700">New Medicines</h5>
              {!isReadOnly && userRole === 'doctor' && (
                <button
                  type="button"
                  onClick={addMedicine}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Medicine
                </button>
              )}
            </div>

            {medicines.length > 0 && (
              <div className="space-y-3">
                {medicines.map((medicine, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h5 className="font-medium text-gray-900">Medicine {index + 1}</h5>
                      {!isReadOnly && userRole === 'doctor' && (
                        <button
                          type="button"
                          onClick={() => removeMedicine(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Medicine Name</label>
                        <input
                          type="text"
                          value={medicine.name}
                          onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                          disabled={isReadOnly}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="e.g., Aspirin"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Medicine Type</label>
                        <select
                          value={medicine.type}
                          onChange={(e) => {
                            const type = e.target.value as 'tablet' | 'syrup';
                            updateMedicine(index, 'type', type);
                            updateMedicine(index, 'unit', type === 'tablet' ? 'mg' : 'ml');
                          }}
                          disabled={isReadOnly}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="tablet">Tablet</option>
                          <option value="syrup">Syrup</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Dosage ({medicine.unit})</label>
                        <input
                          type="text"
                          value={medicine.dosage}
                          onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                          disabled={isReadOnly}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder={medicine.type === 'tablet' ? 'e.g., 75' : 'e.g., 5'}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Daily Schedule</label>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600">Morning</label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={medicine.morning}
                            onChange={(e) => updateMedicine(index, 'morning', parseInt(e.target.value) || 0)}
                            disabled={isReadOnly}
                            className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">Lunch</label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={medicine.lunch}
                            onChange={(e) => updateMedicine(index, 'lunch', parseInt(e.target.value) || 0)}
                            className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">Dinner</label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={medicine.dinner}
                            onChange={(e) => updateMedicine(index, 'dinner', parseInt(e.target.value) || 0)}
                            className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700">Meal Timing</label>
                      <select
                        value={medicine.mealTiming}
                        onChange={(e) => updateMedicine(index, 'mealTiming', e.target.value as 'before' | 'after')}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        <option value="after">After Meal</option>
                        <option value="before">Before Meal</option>
                      </select>
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700">Duration (Days)</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={medicine.duration}
                          onChange={(e) => updateMedicine(index, 'duration', parseInt(e.target.value) || 1)}
                          disabled={isReadOnly}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Enter number of days"
                        />
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => updateMedicine(index, 'duration', 7)}
                            disabled={isReadOnly}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                          >
                            7d
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMedicine(index, 'duration', 14)}
                            disabled={isReadOnly}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                          >
                            14d
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMedicine(index, 'duration', 30)}
                            disabled={isReadOnly}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                          >
                            30d
                          </button>
                        </div>
                      </div>
                      {medicine.duration > 0 && (
                        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <p><strong>Course Duration:</strong> {medicine.duration} day{medicine.duration !== 1 ? 's' : ''}</p>
                          <p><strong>Start Date:</strong> {new Date().toLocaleDateString()}</p>
                          <p><strong>End Date:</strong> {new Date(Date.now() + medicine.duration * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                      <textarea
                        value={medicine.notes}
                        onChange={(e) => updateMedicine(index, 'notes', e.target.value)}
                        rows={2}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        placeholder="Special instructions, side effects, etc..."
                      />
                    </div>

                    {medicine.name && medicine.dosage && (
                      <div className="mt-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                        <p className="text-sm text-blue-800">
                          <strong>{medicine.name} {medicine.dosage}{medicine.unit}</strong>
                        </p>
                        <p className="text-xs text-blue-600">
                          {medicine.morning}+{medicine.lunch}+{medicine.dinner} ({medicine.mealTiming} meal)
                        </p>
                        {medicine.duration > 0 && (
                          <p className="text-xs text-blue-600">
                            Duration: {medicine.duration} day{medicine.duration !== 1 ? 's' : ''} 
                            ({new Date().toLocaleDateString()} - {new Date(Date.now() + medicine.duration * 24 * 60 * 60 * 1000).toLocaleDateString()})
                          </p>
                        )}
                        {medicine.notes && (
                          <p className="text-xs text-blue-600 mt-1">
                            <em>Notes: {medicine.notes}</em>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {!isReadOnly && userRole === 'doctor' && (
              <button
                type="button"
                onClick={addMedicine}
                className="btn-primary text-sm flex items-center gap-2 w-full justify-center"
              >
                <PlusIcon className="h-4 w-4" />
                Add Medicine
              </button>
            )}
          </div>
        )}

        {/* Symptoms Tab */}
        {activeTab === 'symptoms' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-md font-medium text-gray-900">Patient Symptoms</h4>
            </div>

            {symptoms.length > 0 ? (
              <div className="space-y-3">
                {symptoms.map((symptom) => (
                  <div key={symptom.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <textarea
                        value={symptom.description}
                        onChange={(e) => updateSymptom(symptom.id, e.target.value)}
                        rows={2}
                        className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        placeholder="Describe the symptom..."
                      />
                      <button
                        type="button"
                        onClick={() => removeSymptom(symptom.id)}
                        className="ml-3 text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No symptoms added yet. Click "Add Symptom" to start.</p>
              </div>
            )}
            
            {!isReadOnly && userRole === 'doctor' && (
              <button
                type="button"
                onClick={addSymptom}
                className="btn-primary text-sm flex items-center gap-2 w-full justify-center"
              >
                <PlusIcon className="h-4 w-4" />
                Add Symptom
              </button>
            )}
          </div>
        )}

        {/* Diagnosis Tab */}
        {activeTab === 'diagnosis' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-md font-medium text-gray-900">Diagnosis</h4>
              <button
                type="button"
                onClick={addDiagnosis}
                className="btn-primary text-sm flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Add Diagnosis
              </button>
            </div>

            {diagnoses.length > 0 ? (
              <div className="space-y-3">
                {diagnoses.map((diagnosis) => (
                  <div key={diagnosis.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          value={diagnosis.date}
                          onChange={(e) => updateDiagnosis(diagnosis.id, 'date', e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDiagnosis(diagnosis.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={diagnosis.description}
                      onChange={(e) => updateDiagnosis(diagnosis.id, 'description', e.target.value)}
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Enter diagnosis details..."
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BeakerIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No diagnosis added yet. Click "Add Diagnosis" to start.</p>
              </div>
            )}
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="space-y-6">
            {/* Exercises Section */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Exercises</h4>
              <textarea
                {...form.register('exercises')}
                rows={4}
                disabled={isReadOnly}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter exercise recommendations..."
              />
            </div>

            {/* Dietary Changes Section */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Dietary Changes</h4>
              <textarea
                {...form.register('dietaryChanges')}
                rows={4}
                disabled={isReadOnly}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter dietary modification suggestions..."
              />
            </div>

            {/* Lifestyle Modifications Section */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Lifestyle Modifications</h4>
              <textarea
                {...form.register('suggestions')}
                rows={4}
                disabled={isReadOnly}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter lifestyle modification suggestions..."
              />
            </div>

            {/* Follow-up Section */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Follow-up Instructions</h4>
              <textarea
                rows={4}
                disabled={isReadOnly}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter follow-up instructions..."
              />
            </div>

            {/* Emergency Instructions Section */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Emergency Instructions</h4>
              <textarea
                rows={4}
                disabled={isReadOnly}
                className="block w-full px-3 py-2 border border-red-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter emergency instructions..."
              />
            </div>
          </div>
        )}

        {/* Tests Ordered Tab */}
        {activeTab === 'tests' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-md font-medium text-gray-900">Tests Ordered</h4>
            </div>

            {/* Search and Add Tests */}
            {!isReadOnly && userRole === 'doctor' && (
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={testSearchTerm}
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log('Search term changed:', value);
                      setTestSearchTerm(value);
                      setShowTestSearch(value.length > 0);
                    }}
                    placeholder="Search for lab tests..."
                    className="input-field pl-10"
                  />
                </div>

                {/* Search Results */}
                {showTestSearch && (
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {labTestsLoading ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                        Loading tests...
                      </div>
                    ) : availableLabTests && availableLabTests.length > 0 ? (
                      <div className="space-y-2 p-2">
                        {availableLabTests.map((labTest: any) => (
                          <div
                            key={labTest.id}
                            className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => addTestFromSearch(labTest)}
                          >
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{labTest.name}</h5>
                              <p className="text-sm text-gray-600">{labTest.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {labTest.category}
                                </span>
                                {labTest.price && (
                                  <span className="text-xs font-medium text-gray-700">
                                    {formatCurrency(labTest.price)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <PlusIcon className="h-5 w-5 text-primary-600" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        <BeakerIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>No tests found matching "{testSearchTerm}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Current Tests List */}
            {tests.length > 0 ? (
              <div className="space-y-3">
                {tests.map((test) => (
                  <div key={test.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{test.name || 'Test'}</h5>
                        {test.category && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                            {test.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {test.price && (
                          <span className="text-sm font-medium text-gray-700">{formatCurrency(test.price)}</span>
                        )}
                        {!isReadOnly && userRole === 'doctor' && (
                          <button
                            type="button"
                            onClick={() => removeTest(test.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Test Name</label>
                        <input
                          type="text"
                          value={test.name}
                          onChange={(e) => updateTest(test.id, 'name', e.target.value)}
                          disabled={isReadOnly || !!test.testId}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="e.g., Blood Test, X-Ray"
                        />
                        {test.testId && (
                          <p className="text-xs text-gray-500 mt-1">This test is from our lab test database</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                          value={test.description}
                          onChange={(e) => updateTest(test.id, 'description', e.target.value)}
                          rows={3}
                          disabled={isReadOnly}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Describe the test requirements..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BeakerIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No tests added yet. Search above to add from available tests or add manually.</p>
              </div>
            )}
            
            {/* Manual Add Button */}
            {!isReadOnly && userRole === 'doctor' && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={addTest}
                  className="btn-primary text-sm flex items-center gap-2 flex-1 justify-center"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Manual Test
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h4 className="text-md font-medium text-gray-900">Lab Reports</h4>
            
             {/* Patient Lab Reports */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                    <BeakerIcon className="h-5 w-5" />
                    Patient Lab Reports
                  </h5>
                  
                  {/* Lab Test Orders */}
                  {patientLabOrders && patientLabOrders.length > 0 && (
                    <div className="mb-4">
                      <h6 className="font-medium text-gray-800 mb-2">Lab Test Orders</h6>
                      <div className="space-y-3">
                        {patientLabOrders.slice(0, 3).map((order: any) => (
                          <div key={order.id} className="bg-white p-4 rounded border">
                            <div className="mb-3">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-medium text-sm text-gray-900">
                                    Order #{order.orderNumber}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Date: {new Date(order.createdAt).toLocaleDateString()}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Status: <span className={`px-2 py-1 rounded text-xs ${
                                      order.status === 'reported' ? 'bg-green-100 text-green-800' :
                                      order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                      order.status === 'ordered' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                                    </span>
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">
                                    {order.testDetails?.length || 0} test{order.testDetails?.length !== 1 ? 's' : ''}
                                  </p>
                                  {order.totalAmount && (
                                    <p className="text-xs text-gray-600">
                                      {formatCurrency(order.totalAmount)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Individual Test Details */}
                            {order.testDetails && order.testDetails.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-gray-700 uppercase tracking-wide">Test Details</div>
                                {order.testDetails.map((test: any, index: number) => (
                                  <div key={index} className="bg-gray-50 p-3 rounded border-l-4 border-green-200">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm text-gray-900">{test.name}</p>
                                        {test.description && (
                                          <p className="text-xs text-gray-600 mt-1">{test.description}</p>
                                        )}
                                        {test.category && (
                                          <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                            {test.category}
                                          </span>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">
                                          Ordered: {new Date(order.createdAt).toLocaleDateString()}
                                        </p>
                                      </div>
                                      <div className="text-right ml-3">
                                        <div className="flex flex-col items-end space-y-1">
                                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                            Lab Test
                                          </span>
                                          {test.price && (
                                            <span className="text-xs text-gray-600">
                                              {formatCurrency(test.price)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Test Results/Files */}
                                    {order.status === 'reported' && order.testReports && order.testReports.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-xs font-medium text-gray-700 mb-1">Result Files:</p>
                                        <div className="space-y-1">
                                          {order.testReports.map((file: any, fileIndex: number) => (
                                            <div key={fileIndex} className="flex items-center justify-between bg-white p-2 rounded border">
                                              <div className="flex items-center space-x-2">
                                                <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                                                <span className="text-xs text-gray-900">{file.originalName || file.filename}</span>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  // Handle file download
                                                  const link = document.createElement('a');
                                                  link.href = `/uploads/lab-results/${file.filename}`;
                                                  link.download = file.originalName || file.filename;
                                                  link.click();
                                                }}
                                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                                              >
                                                <ArrowDownTrayIcon className="h-3 w-3" />
                                                <span>Download</span>
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {patientLabOrders.length > 3 && (
                          <p className="text-xs text-gray-500 text-center">
                            +{patientLabOrders.length - 3} more orders
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Prescription Lab Tests */}
                  {patientPrescriptionLabTests && patientPrescriptionLabTests.length > 0 && (
                    <div className="mb-4">
                      <h6 className="font-medium text-gray-800 mb-2">Prescription Lab Tests</h6>
                      <div className="space-y-3">
                        {(showAllPrescriptions ? patientPrescriptionLabTests : patientPrescriptionLabTests.slice(0, 3)).map((prescription: any) => (
                          <div key={prescription.id} className="bg-white p-4 rounded border">
                            <div className="mb-3">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-medium text-sm text-gray-900">
                                    Prescription #{prescription.id}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Date: {new Date(prescription.createdAt).toLocaleDateString()}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Doctor: Dr. {prescription.appointment?.doctor?.user?.firstName} {prescription.appointment?.doctor?.user?.lastName}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">
                                    {prescription.parsedTests?.length || 0} test{prescription.parsedTests?.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Individual Test Details */}
                            {prescription.parsedTests && prescription.parsedTests.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-gray-700 uppercase tracking-wide">Test Details</div>
                                {prescription.parsedTests.map((test: any, index: number) => (
                                  <div key={index} className="bg-gray-50 p-3 rounded border-l-4 border-blue-200">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm text-gray-900">{test.name}</p>
                                        {test.description && (
                                          <p className="text-xs text-gray-600 mt-1">{test.description}</p>
                                        )}
                                        {test.category && (
                                          <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                            {test.category}
                                          </span>
                                        )}
                                        {test.takenDate && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            Taken: {new Date(test.takenDate).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-right ml-3">
                                        <div className="flex flex-col items-end space-y-1">
                                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            test.status === 'reported' ? 'bg-green-100 text-green-800' :
                                            test.status === 'ordered' ? 'bg-yellow-100 text-yellow-800' :
                                            test.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {test.status?.charAt(0).toUpperCase() + test.status?.slice(1) || 'Unknown'}
                                          </span>
                                          {test.price && (
                                            <span className="text-xs text-gray-600">
                                              {formatCurrency(test.price)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Test Results/Files */}
                                    {test.status === 'reported' && test.resultFiles && test.resultFiles.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-xs font-medium text-gray-700 mb-1">Result Files:</p>
                                        <div className="space-y-1">
                                          {test.resultFiles.map((file: any, fileIndex: number) => (
                                            <div key={fileIndex} className="flex items-center justify-between bg-white p-2 rounded border">
                                              <div className="flex items-center space-x-2">
                                                <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                                                <span className="text-xs text-gray-900">{file.originalName || file.filename}</span>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  // Handle file download
                                                  const link = document.createElement('a');
                                                  link.href = `/uploads/lab-results/${file.filename}`;
                                                  link.download = file.originalName || file.filename;
                                                  link.click();
                                                }}
                                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                                              >
                                                <ArrowDownTrayIcon className="h-3 w-3" />
                                                <span>Download</span>
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {patientPrescriptionLabTests.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setShowAllPrescriptions(!showAllPrescriptions)}
                            className="text-xs text-blue-600 hover:text-blue-800 text-center w-full py-2 hover:bg-blue-50 rounded transition-colors"
                          >
                            {showAllPrescriptions 
                              ? 'Show Less' 
                              : `+${patientPrescriptionLabTests.length - 3} more prescriptions`
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Debug Information */}
                  {(labOrdersLoading || prescriptionLabTestsLoading) && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">Loading lab reports...</p>
                    </div>
                  )}

                  {/* Error Information */}
                  {(labOrdersError || prescriptionLabTestsError) && (
                    <div className="text-center py-4">
                      <p className="text-sm text-red-500">Error loading lab reports</p>
                      <p className="text-xs text-gray-400">
                        {labOrdersError?.message || prescriptionLabTestsError?.message}
                      </p>
                    </div>
                  )}

                  {/* Debug Info */}
                  <div className="text-xs text-gray-400 mb-2">
                    Patient ID: {appointmentData?.patient?.id} | 
                    Lab Orders: {patientLabOrders?.length || 0} | 
                    Prescription Tests: {patientPrescriptionLabTests?.length || 0}
                  </div>

                  {/* No Lab Reports */}
                  {!labOrdersLoading && !prescriptionLabTestsLoading && 
                   !labOrdersError && !prescriptionLabTestsError &&
                   (!patientLabOrders || patientLabOrders.length === 0) && 
                   (!patientPrescriptionLabTests || patientPrescriptionLabTests.length === 0) && (
                    <div className="text-center py-4">
                      <BeakerIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No lab reports found</p>
                      <p className="text-xs text-gray-400">Patient has no previous lab tests with 'reported' status</p>
                    </div>
                  )}
                 </div>
            
            {/* Test Status Overview */}
            {tests.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <BeakerIcon className="h-5 w-5" />
                  Current Test Status
                </h5>
                <div className="space-y-2">
                  {tests.map((test) => (
                    <div key={test.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <span className="text-sm">{test.name}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        test.status === 'ordered' ? 'bg-yellow-100 text-yellow-800' :
                        test.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        test.status === 'done' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reports Upload Section - Admin Only */}
            {userRole === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Test Reports</label>
                <textarea
                  {...form.register('reports')}
                  rows={6}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Test reports can be uploaded here. Reports can include images, PDFs, and other formats..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Note: Only administrators can upload test reports.
                </p>
              </div>
            )}
            
          </div>
        )}

        {/* Action Buttons */}
        {!isReadOnly && userRole === 'doctor' && (
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Save Prescription
                </>
              )}
            </button>
          </div>
        )}
        
        {isReadOnly && (
          <div className="pt-6 border-t border-gray-200">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-yellow-800 text-sm">
                  This prescription is completed and cannot be edited.
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default PrescriptionInterface;
