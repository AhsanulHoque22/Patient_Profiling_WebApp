import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { formatCurrency } from '../services/paymentService';
import { 
  BeakerIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface LabTest {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  sampleType: string;
  preparationInstructions: string;
  reportDeliveryTime: number;
}

interface LabOrder {
  id: number;
  orderNumber: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  sampleCollectionDate: string;
  expectedResultDate: string;
  resultUrl: string;
  notes: string;
  createdAt: string;
  verifiedAt: string;
  sampleId?: string;
  testDetails: LabTest[];
  payments: Array<{
    id: number;
    amount: number;
    paymentMethod: string;
    status: string;
    paidAt: string;
    transactionId: string;
  }>;
  patient: {
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
  };
  doctor?: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  verifier?: {
    firstName: string;
    lastName: string;
  };
}

interface PrescriptionLabTest {
  id: string;
  name: string;
  description: string;
  status: string;
  paymentStatus: string;
  type: string;
  prescriptionId: number;
  appointmentDate: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctorName: string;
  createdAt: string;
  price?: number;
  sampleId?: string;
  payments?: Array<{
    id: number;
    amount: number;
    paymentMethod: string;
    status: string;
    paidAt: string;
    transactionId: string;
    processedBy: number;
    notes?: string;
  }>;
  testReports: Array<{
    filename: string;
    originalName: string;
    path: string;
    uploadedAt: string;
  }>;
}

const AdminLabReports: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [testTypeFilter, setTestTypeFilter] = useState<'all' | 'prescribed' | 'ordered'>('all');
  
  // Prescription lab test management states
  const [selectedPrescriptionTest, setSelectedPrescriptionTest] = useState<PrescriptionLabTest | null>(null);
  const [showPrescriptionUploadModal, setShowPrescriptionUploadModal] = useState(false);
  const [showPaymentProcessingModal, setShowPaymentProcessingModal] = useState(false);
  const [selectedTestForPayment, setSelectedTestForPayment] = useState<any>(null);
  const [paymentProcessingData, setPaymentProcessingData] = useState({
    paidAmount: 0,
    transactionId: '',
    paymentMethod: 'offline',
    notes: ''
  });
  
  // Cash payment modal states
  const [showCashPaymentModal, setShowCashPaymentModal] = useState(false);
  const [selectedTestForCashPayment, setSelectedTestForCashPayment] = useState<any>(null);
  const [cashPaymentData, setCashPaymentData] = useState({
    amount: '',
    notes: ''
  });

  // Payment history modal states
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [selectedTestForPaymentHistory, setSelectedTestForPaymentHistory] = useState<any>(null);

  // Tab and section states
  const [activeTab, setActiveTab] = useState('pending');
  const [sectionSearchTerms, setSectionSearchTerms] = useState({
    pending: '',
    inProgress: '',
    readyForResults: '',
    completed: ''
  });
  const [prescriptionPaymentData, setPrescriptionPaymentData] = useState({
    paymentMethod: '',
    amount: '',
    transactionId: '',
    notes: ''
  });
  const [prescriptionStatusData, setPrescriptionStatusData] = useState({
    status: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState<FileList | null>(null);
  
  const queryClient = useQueryClient();

  // Get all available patient names for suggestions
  const getAllPatientNames = () => {
    const patientNames = new Set<string>();
    
    console.log('Getting patient names...');
    console.log('Prescription data:', prescriptionLabTestsData?.data?.labTests);
    console.log('Orders data:', ordersData?.data?.orders);
    
    // Add prescription lab tests
    if (prescriptionLabTestsData?.data?.labTests) {
      prescriptionLabTestsData.data.labTests.forEach((test: PrescriptionLabTest) => {
        if (test.patientName) {
          patientNames.add(test.patientName);
          console.log('Added prescription patient name:', test.patientName);
        }
      });
    }
    
    // Add regular lab orders
    if (ordersData?.data?.orders) {
      ordersData.data.orders.forEach((order: LabOrder) => {
        const patientName = order.patient?.user?.firstName + ' ' + order.patient?.user?.lastName;
        if (patientName && patientName !== 'undefined undefined') {
          patientNames.add(patientName);
          console.log('Added order patient name:', patientName);
        }
      });
    }
    
    const allNames = Array.from(patientNames);
    console.log('All patient names collected:', allNames);
    return allNames;
  };

  // Generate suggestions from all available patient names
  const generateSuggestions = (allTests: any[]) => {
    const patientNames = new Set<string>();
    allTests.forEach(test => {
      if (test.patientName) {
        patientNames.add(test.patientName);
      }
    });
    return Array.from(patientNames);
  };

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    // Check if there are at least 2 non-space characters
    const nonSpaceChars = value.replace(/\s/g, '').length;
    if (nonSpaceChars >= 2) {
      // Get all patient names for suggestions
      const allPatientNames = getAllPatientNames();
      // Filter suggestions based on input (handle spaces better)
      const searchWords = value.toLowerCase().trim().split(/\s+/);
      const filteredSuggestions = allPatientNames.filter(name => {
        const nameLower = name.toLowerCase();
        // Check if all search words are contained in the name
        return searchWords.every(word => nameLower.includes(word));
      });
      
      setSuggestions(filteredSuggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // Handle search submission
  const handleSearchSubmit = () => {
    const trimmedSearch = searchTerm.trim();
    
    // Only search if there are at least 2 non-space characters
    const nonSpaceChars = trimmedSearch.replace(/\s/g, '').length;
    if (nonSpaceChars >= 2) {
      setActiveSearchTerm(trimmedSearch);
      setShowSuggestions(false);
      setPage(1);
    } else {
      setActiveSearchTerm('');
      setShowSuggestions(false);
      setPage(1);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setSearchTerm(suggestion);
    setActiveSearchTerm(suggestion.trim());
    setShowSuggestions(false);
    setPage(1);
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setActiveSearchTerm('');
    setShowSuggestions(false);
    setSuggestions([]);
    setPage(1);
  };

  // Fetch all lab orders for admin
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-lab-orders', statusFilter, activeSearchTerm, dateFrom, dateTo, page],
    queryFn: async () => {
      console.log('🔍 Fetching admin lab orders with params:', { statusFilter, activeSearchTerm, dateFrom, dateTo, page });
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(statusFilter && { status: statusFilter }),
        ...(activeSearchTerm && { search: activeSearchTerm }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      const response = await axios.get(`/admin/lab-orders?${params}`);
      console.log('📊 Admin lab orders response:', response.data);
      return response.data;
    },
  });

  // Fetch prescription lab tests for admin
  const { data: prescriptionLabTestsData, isLoading: prescriptionTestsLoading } = useQuery({
    queryKey: ['admin-prescription-lab-tests', activeSearchTerm, dateFrom, dateTo, page],
    queryFn: async () => {
      console.log('🔍 Fetching admin prescription lab tests with params:', { activeSearchTerm, dateFrom, dateTo, page });
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(activeSearchTerm && { search: activeSearchTerm }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      const response = await axios.get(`/admin/prescription-lab-tests?${params}`);
      console.log('📊 Admin prescription lab tests response:', response.data);
      return response.data;
    },
  });

  // Refresh suggestions when data changes
  useEffect(() => {
    if (searchTerm.length >= 2) {
      handleSearchChange(searchTerm);
    }
  }, [prescriptionLabTestsData, ordersData]);

  // Handle patientId from URL parameters
  useEffect(() => {
    const patientId = searchParams.get('patientId');
    if (patientId) {
      // Set a default search to filter by this patient
      setActiveSearchTerm(`Patient ID: ${patientId}`);
      // You could also set other filters here if needed
    }
  }, [searchParams]);

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, notes, sampleCollectionDate, expectedResultDate }: any) => {
      const response = await axios.put(`/admin/lab-orders/${orderId}/status`, {
        status,
        notes,
        sampleCollectionDate,
        expectedResultDate
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
      toast.success('Order status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });


  // Upload results mutation
  const uploadResultsMutation = useMutation({
    mutationFn: async ({ orderId, files, notes }: { orderId: number; files: FileList | null; notes: string }) => {
      const formData = new FormData();
      
      // Handle multiple files or single file
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file) {
            formData.append('files', file);
          }
        }
      }
      
      if (notes) formData.append('notes', notes);
      
      const response = await axios.post(`/admin/lab-orders/${orderId}/upload-results`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
      toast.success(data.message || 'Lab results uploaded successfully');
      setUploadedFiles(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload results');
    },
  });

  // Prescription lab test mutations
  const updatePrescriptionStatusMutation = useMutation({
    mutationFn: async ({ testId, status }: { testId: string; status: string }) => {
      const response = await axios.put(`/admin/prescription-lab-tests/${testId}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['admin-prescription-lab-tests'],
        exact: false 
      });
      toast.success('Test status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });

  const processPrescriptionPaymentMutation = useMutation({
    mutationFn: async ({ testId, paymentData }: { testId: string; paymentData: any }) => {
      const response = await axios.post(`/admin/prescription-lab-tests/${testId}/payment`, paymentData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['admin-prescription-lab-tests'],
        exact: false 
      });
      toast.success('Payment processed successfully');
      setPrescriptionPaymentData({ paymentMethod: '', amount: '', transactionId: '', notes: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process payment');
    },
  });

  const uploadPrescriptionResultsMutation = useMutation({
    mutationFn: async ({ testId, files }: { testId: string; files: FileList }) => {
      const formData = new FormData();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file) {
          formData.append('files', file);
        }
      }
      
      const response = await axios.post(`/admin/prescription-lab-tests/${testId}/upload-results`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['admin-prescription-lab-tests'],
        exact: false 
      });
      toast.success('Test results uploaded successfully');
      setShowPrescriptionUploadModal(false);
      setUploadedFiles(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload results');
    },
  });

  // Confirm lab order reports mutation
  const confirmLabOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      console.log('🚀 confirmLabOrderMutation called with orderId:', orderId);
      console.log('🚀 Making API call to:', `/admin/lab-orders/${orderId}/confirm-reports`);
      const response = await axios.post(`/admin/lab-orders/${orderId}/confirm-reports`);
      console.log('✅ confirmLabOrderMutation API response:', response.data);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ confirmLabOrderMutation SUCCESS:', data);
      console.log('🔄 Invalidating queries...');
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
      queryClient.invalidateQueries({ 
        queryKey: ['admin-prescription-lab-tests'],
        exact: false 
      });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      
      // Force refetch with a small delay
      setTimeout(() => {
        console.log('🔄 Force refetching queries...');
        queryClient.refetchQueries({ queryKey: ['admin-lab-orders'] });
        queryClient.refetchQueries({ 
          queryKey: ['admin-prescription-lab-tests'],
          exact: false 
        });
        queryClient.refetchQueries({ queryKey: ['admin'] });
        console.log('✅ Force refetch completed');
      }, 100);
      
      console.log('✅ Queries invalidated, showing toast');
      toast.success('Reports confirmed and sent to patient - moved to completed section');
    },
    onError: (error: any) => {
      console.error('❌ confirmLabOrderMutation error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error headers:', error.response?.headers);
      console.error('❌ Full error object:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to confirm reports');
    },
  });

  // Confirm prescription lab test reports mutation
  const confirmPrescriptionMutation = useMutation({
    mutationFn: async (testId: string) => {
      console.log('🚀 confirmPrescriptionMutation called with testId:', testId);
      console.log('🚀 Making API call to:', `/admin/prescription-lab-tests/${testId}/confirm-reports`);
      
      try {
        const response = await axios.post(`/admin/prescription-lab-tests/${testId}/confirm-reports`, {}, {
          timeout: 10000 // 10 second timeout
        });
        console.log('✅ confirmPrescriptionMutation API response:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ confirmPrescriptionMutation API error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('✅ confirmPrescriptionMutation SUCCESS:', data);
      console.log('🔄 Invalidating queries...');
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ 
        queryKey: ['admin-prescription-lab-tests'],
        exact: false 
      });
      queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      
      // Force refetch with a small delay
      setTimeout(() => {
        console.log('🔄 Force refetching queries...');
        queryClient.refetchQueries({ 
          queryKey: ['admin-prescription-lab-tests'],
          exact: false 
        });
        queryClient.refetchQueries({ queryKey: ['admin-lab-orders'] });
        queryClient.refetchQueries({ queryKey: ['admin'] });
        console.log('✅ Force refetch completed');
      }, 100);
      
      console.log('✅ Queries invalidated, showing toast');
      toast.success('Test reports confirmed and sent to patient - moved to completed section');
    },
    onError: (error: any) => {
      console.error('❌ confirmPrescriptionMutation error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error headers:', error.response?.headers);
      console.error('❌ Full error object:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to confirm reports');
    },
  });

  // Revert lab order reports mutation
  const revertLabOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await axios.post(`/admin/lab-orders/${orderId}/revert-reports`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
      queryClient.invalidateQueries({ 
        queryKey: ['admin-prescription-lab-tests'],
        exact: false 
      });
      toast.success('Reports reverted back to reported status');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to revert reports');
    },
  });

  // Revert prescription lab test reports mutation
  const revertPrescriptionMutation = useMutation({
    mutationFn: async (testId: string) => {
      const response = await axios.post(`/admin/prescription-lab-tests/${testId}/revert-reports`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['admin-prescription-lab-tests'],
        exact: false 
      });
      queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
      toast.success('Test reports reverted back to reported status');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to revert reports');
    },
  });

  // Payment processing mutation (new system)
  const processNewPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post('/admin/process-payment', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-prescription-lab-tests'], exact: false });
      toast.success('Payment processed successfully');
      setShowPaymentProcessingModal(false);
      setSelectedTestForPayment(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process payment');
    },
  });

  // Update to sample processing mutation
  const updateToSampleProcessingMutation = useMutation({
    mutationFn: async (testId: string) => {
      const response = await axios.put(`/admin/tests/${testId}/sample-processing`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-prescription-lab-tests'], exact: false });
      toast.success('Test status updated to sample processing');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update test status');
    },
  });

  // Update to sample taken mutation
  const updateToSampleTakenMutation = useMutation({
    mutationFn: async (testId: string) => {
      const response = await axios.put(`/admin/tests/${testId}/sample-taken`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-prescription-lab-tests'], exact: false });
      toast.success('Test status updated to sample taken');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update test status');
    },
  });

  // Approve test mutation
  const approveTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      const response = await axios.post(`/admin/prescription-lab-tests/${testId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prescription-lab-tests'], exact: false });
      toast.success('Test approved successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve test');
    },
  });

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      'ordered': 'bg-slate-100 text-slate-800 border border-slate-300',
      'approved': 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      'sample_processing': 'bg-purple-100 text-purple-800 border border-purple-300',
      'sample_taken': 'bg-indigo-100 text-indigo-800 border border-indigo-300',
      'reported': 'bg-blue-100 text-blue-800 border border-blue-300',
      'confirmed': 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      'cancelled': 'bg-red-100 text-red-800 border border-red-300'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border border-gray-300';
  };

  const getPaymentStatusBadgeColor = (status: string) => {
    const colors = {
      'not_paid': 'bg-red-100 text-red-800 border border-red-300',
      'partially_paid': 'bg-orange-100 text-orange-800 border border-orange-300',
      'paid': 'bg-green-100 text-green-800 border border-green-300'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border border-gray-300';
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Helper functions for test categorization
  const categorizeTests = (tests: any[]) => {
    const categories = {
      pending: [] as any[],      // ordered, approved (waiting for payment/processing)
      inProgress: [] as any[],   // sample_processing, sample_taken
      readyForResults: [] as any[], // reported (results uploaded, waiting for confirmation)
      completed: [] as any[]     // confirmed (results sent to patients)
    };

    console.log('🔍 Categorizing tests:', tests.length, 'total tests');
    console.log('Test statuses:', tests.map(t => ({ id: t.id, name: t.name, status: t.status, type: t.type })));

    tests.forEach(test => {
      console.log(`Processing test: ${test.name} with status: ${test.status}`);
      if (test.status === 'confirmed') {
        categories.completed.push(test);
        console.log(`✅ Added ${test.name} to completed`);
      } else if (test.status === 'reported') {
        categories.readyForResults.push(test);
        console.log(`✅ Added ${test.name} to readyForResults`);
      } else if (test.status === 'sample_processing' || test.status === 'sample_taken') {
        categories.inProgress.push(test);
        console.log(`✅ Added ${test.name} to inProgress`);
      } else {
        categories.pending.push(test);
        console.log(`✅ Added ${test.name} to pending`);
      }
    });

    console.log('📊 Final categories:', {
      pending: categories.pending.length,
      inProgress: categories.inProgress.length,
      readyForResults: categories.readyForResults.length,
      completed: categories.completed.length
    });

    return categories;
  };

  // Enhanced search function that works with the main search term
  const applyMainSearch = (tests: any[], searchTerm: string) => {
    if (!searchTerm.trim()) return tests;
    
    const searchWords = searchTerm.toLowerCase().trim().split(/\s+/);
    // Debug logs removed for performance
    
    return tests.filter(test => {
      const patientName = test.patientName?.toLowerCase() || '';
      const patientEmail = test.patientEmail?.toLowerCase() || '';
      const doctorName = test.doctorName?.toLowerCase() || '';
      const testName = test.name?.toLowerCase() || '';
      
      // Check if all search words match any field
      const matches = searchWords.every(word => 
        patientName.includes(word) || 
        patientEmail.includes(word) ||
        doctorName.includes(word) ||
        testName.includes(word)
      );
      
        // Debug logs removed for performance
      
      return matches;
    });
  };

  const filterTestsBySearch = (tests: any[], searchTerm: string) => {
    if (!searchTerm.trim()) return tests;
    
    const searchWords = searchTerm.toLowerCase().trim().split(/\s+/);
    // Debug logs removed for performance
    
    return tests.filter(test => {
      const patientName = test.patientName?.toLowerCase() || '';
      const patientEmail = test.patientEmail?.toLowerCase() || '';
      const doctorName = test.doctorName?.toLowerCase() || '';
      const testName = test.name?.toLowerCase() || '';
      
      // Check if all search words match any field
      const matches = searchWords.every(word => 
        patientName.includes(word) || 
        patientEmail.includes(word) ||
        doctorName.includes(word) ||
        testName.includes(word)
      );
      
        // Debug logs removed for performance
      
      return matches;
    });
  };

  const handleSectionSearchChange = (section: string, value: string) => {
    setSectionSearchTerms(prev => ({
      ...prev,
      [section]: value
    }));
  };

  // Test card component
  const TestCard = ({ test }: { test: any }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow w-full max-w-full overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{test.name}</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="font-medium">Patient:</span> {test.patientName}</p>
            <p><span className="font-medium">Doctor:</span> {test.doctorName}</p>
            <p><span className="font-medium">Email:</span> {test.patientEmail}</p>
            <p><span className="font-medium">Phone:</span> {test.patientPhone}</p>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(test.status)}`}>
            {formatStatus(test.status)}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${getPaymentStatusBadgeColor(test.paymentStatus || 'not_paid')}`}>
            {test.paymentStatus === 'paid' ? 'Paid' : 
             test.paymentStatus === 'partially_paid' ? 'Partially Paid' : 'Not Paid'}
          </span>
          <span className="text-sm text-gray-500">
            {test.sampleId && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                ID: {test.sampleId}
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-700">Total Amount:</span>
          <span className="font-medium">৳{test.totalAmount || test.price || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Paid Amount:</span>
          <span className="font-medium text-green-600">৳{test.paidAmount || 0}</span>
        </div>
        <hr className="my-2 border-gray-200" />
        <div className="flex justify-between">
          <span className="text-gray-700 font-medium">Remaining Amount:</span>
          <span className="font-medium text-red-600">৳{(test.totalAmount || test.price || 0) - (test.paidAmount || 0)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 w-full overflow-hidden">
        {test.status === 'ordered' && (
          <button
            onClick={() => handleApproveTest(test)}
            disabled={approveTestMutation.isPending}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {approveTestMutation.isPending ? 'Approving...' : 'Approve Test'}
          </button>
        )}
        
        {test.status === 'approved' && (test.paidAmount || 0) >= (test.totalAmount || test.price || 0) * 0.5 && (
          <button
            onClick={() => handleSampleProcessingClick(test)}
            disabled={updateToSampleProcessingMutation.isPending}
            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {updateToSampleProcessingMutation.isPending ? 'Processing...' : 'Start Sample Processing'}
          </button>
        )}

        {test.status === 'sample_processing' && (
          <button
            onClick={() => handleSampleTakenClick(test)}
            disabled={updateToSampleTakenMutation.isPending}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {updateToSampleTakenMutation.isPending ? 'Processing...' : 'Mark Sample Taken'}
          </button>
        )}

        {test.status === 'sample_taken' && (
          <button
            onClick={() => handleUploadPrescriptionResults(test)}
            className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
          >
            Upload Results
          </button>
        )}

        {/* Show uploaded files for reported tests */}
        {test.status === 'reported' && test.testReports && test.testReports.length > 0 && (
          <div className="mb-3 w-full">
            <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Files:</p>
            <div className="space-y-2 w-full">
              {test.testReports.map((file: any, index: number) => (
                <div key={index} className="bg-gray-50 p-3 rounded border w-full overflow-hidden">
                  <div className="flex items-start space-x-3 w-full">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 w-full overflow-hidden">
                      <div className="flex items-start justify-between w-full">
                        <div className="flex-1 min-w-0 max-w-[calc(100%-80px)] overflow-hidden">
                          <p 
                            className="text-sm text-gray-900 truncate block w-full break-all" 
                            title={file.originalName || file.filename}
                            style={{ 
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              wordBreak: 'break-all',
                              hyphens: 'auto'
                            }}
                          >
                            {file.originalName || file.filename}
                          </p>
                        </div>
                        <div className="flex space-x-1 ml-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              // Handle file download
                              const link = document.createElement('a');
                              link.href = `/uploads/lab-results/${file.filename}`;
                              link.download = file.originalName || file.filename;
                              link.click();
                            }}
                            className="px-2 py-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 rounded flex items-center space-x-1 transition-colors whitespace-nowrap"
                          >
                            <ArrowDownTrayIcon className="h-3 w-3" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {test.status === 'reported' && (
          <button
            onClick={() => handleConfirmReports(test)}
            disabled={confirmLabOrderMutation.isPending || confirmPrescriptionMutation.isPending}
            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {(confirmLabOrderMutation.isPending || confirmPrescriptionMutation.isPending) ? 'Confirming...' : 'Confirm & Send Results'}
          </button>
        )}

        {test.status === 'confirmed' && (
          <button
            onClick={() => handleRevertReports(test)}
            disabled={revertLabOrderMutation.isPending || revertPrescriptionMutation.isPending}
            className="px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm"
          >
            {(revertLabOrderMutation.isPending || revertPrescriptionMutation.isPending) ? 'Reverting...' : 'Go Back to In Progress'}
          </button>
        )}


        <button
          onClick={() => handlePaymentProcessingClick(test)}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
        >
          Payment Processing
        </button>

        {(test.totalAmount || test.price || 0) > (test.paidAmount || 0) && (
          <button
            onClick={() => handleCashPaymentClick(test)}
            className="px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
          >
            Record Cash Payment
          </button>
        )}
      </div>
    </div>
  );


  // Prescription lab test helper functions
  const getPrescriptionStatusBadgeColor = (status: string) => {
    const colors = {
      'ordered': 'bg-gray-100 text-gray-800',
      'approved': 'bg-blue-100 text-blue-800',
      'paid': 'bg-green-100 text-green-800',
      'done': 'bg-purple-100 text-purple-800',
      'reported': 'bg-green-100 text-green-800',
      'completed': 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatPrescriptionStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Prescription lab test handlers

  const handleUploadPrescriptionResults = (test: PrescriptionLabTest) => {
    setSelectedPrescriptionTest(test);
    setUploadedFiles(null);
    setShowPrescriptionUploadModal(true);
  };


  const handlePrescriptionUploadSubmit = () => {
    if (selectedPrescriptionTest && uploadedFiles && uploadedFiles.length > 0) {
      uploadPrescriptionResultsMutation.mutate({
        testId: selectedPrescriptionTest.id,
        files: uploadedFiles
      });
    }
  };

  // Helper function to get filtered and combined lab tests for admin
  const getFilteredAdminLabTests = () => {
    const allTests: any[] = [];
    
    console.log('=== Getting Filtered Admin Lab Tests ===');
    console.log('Prescription data:', prescriptionLabTestsData);
    console.log('Orders data:', ordersData);
    console.log('Prescription tests count:', prescriptionLabTestsData?.data?.labTests?.length || 0);
    console.log('Orders count:', ordersData?.data?.orders?.length || 0);
    
    // Add prescription lab tests
    if (prescriptionLabTestsData?.data?.labTests) {
      console.log('Processing prescription tests:', prescriptionLabTestsData.data.labTests.length);
      prescriptionLabTestsData.data.labTests.forEach((test: PrescriptionLabTest) => {
        console.log('Prescription test patient:', test.patientName);
        console.log('Prescription test ID:', test.id, 'Status:', test.status);
        allTests.push({
          ...test,
          type: 'prescription',
          orderNumber: `PRES-${test.prescriptionId}`,
          totalAmount: test.price || 0,
          paidAmount: test.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0,
          dueAmount: (test.price || 0) - (test.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0),
          createdAt: test.createdAt,
          testDetails: [{ name: test.name, description: test.description, price: test.price || 0 }],
          patientName: test.patientName,
          patientEmail: test.patientEmail,
          patientPhone: test.patientPhone
        });
      });
    }
    
    // Add regular lab orders
    if (ordersData?.data?.orders) {
      console.log('Processing regular orders:', ordersData.data.orders.length);
      ordersData.data.orders.forEach((order: LabOrder) => {
        const patientName = order.patient?.user?.firstName + ' ' + order.patient?.user?.lastName || 'Unknown Patient';
        console.log('Order patient:', patientName);
        allTests.push({
          ...order,
          type: 'ordered',
          doctorName: order.doctor?.user?.firstName + ' ' + order.doctor?.user?.lastName || 'Unknown Doctor',
          appointmentDate: order.createdAt,
          prescriptionId: null,
          patientName: patientName,
          patientEmail: order.patient?.user?.email || 'Unknown Email',
          patientPhone: order.patient?.user?.phone || 'Unknown Phone'
        });
      });
    }
    
    // Debug logs removed for performance
    
    // Apply filters
    let filteredTests = allTests;
    
    if (testTypeFilter !== 'all') {
      filteredTests = filteredTests.filter(test => 
        testTypeFilter === 'prescribed' ? test.type === 'prescription' : test.type === 'ordered'
      );
    }
    
    if (statusFilter) {
      filteredTests = filteredTests.filter(test => test.status === statusFilter);
    }
    
    if (activeSearchTerm) {
      const searchWords = activeSearchTerm.toLowerCase().trim().split(/\s+/);
      // Debug logs removed for performance
      filteredTests = filteredTests.filter(test => {
        const patientName = test.patientName?.toLowerCase() || '';
        const patientEmail = test.patientEmail?.toLowerCase() || '';
        const doctorName = test.doctorName?.toLowerCase() || '';
        const testName = test.name?.toLowerCase() || '';
        
        // Debug logs removed for performance
        
        // Check if all search words are contained in any field
        const matches = searchWords.every(word => 
          patientName.includes(word) || 
          patientEmail.includes(word) ||
          doctorName.includes(word) ||
          testName.includes(word)
        );
        
        return matches;
      });
    }
    
    if (dateFrom && dateTo) {
      filteredTests = filteredTests.filter(test => {
        const testDate = new Date(test.appointmentDate || test.createdAt);
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        return testDate >= fromDate && testDate <= toDate;
      });
    }
    
    // Debug logs removed for performance
    
    return filteredTests;
  };

  const filteredTests = getFilteredAdminLabTests();

  // Comprehensive debugging - expose data to window for inspection
  if (typeof window !== 'undefined') {
    (window as any).prescriptionLabTestsData = prescriptionLabTestsData;
    (window as any).ordersData = ordersData;
    (window as any).filteredTests = filteredTests;
    (window as any).testCategories = categorizeTests(filteredTests);
    
    console.log('🔍 ===== DATA DEBUGGING INFO =====');
    console.log('🔍 Orders data:', ordersData);
    console.log('🔍 Prescription lab tests data:', prescriptionLabTestsData);
    console.log('🔍 Filtered tests:', filteredTests);
    console.log('🔍 Test categories:', categorizeTests(filteredTests));
    console.log('🔍 Orders count:', ordersData?.data?.orders?.length || 0);
    console.log('🔍 Prescription tests count:', prescriptionLabTestsData?.data?.labTests?.length || 0);
    console.log('🔍 Total filtered tests:', filteredTests.length);
    console.log('🔍 Tests by status:', filteredTests.reduce((acc, test) => {
      acc[test.status] = (acc[test.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));
    console.log('🔍 ===== END DATA DEBUGGING =====');
  }

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      'ordered': 'verified',
      'verified': 'payment_pending',
      'payment_pending': 'payment_completed',
      'payment_partial': 'payment_completed',
      'payment_completed': 'sample_collection_scheduled',
      'sample_collection_scheduled': 'sample_collected',
      'sample_collected': 'processing',
      'processing': 'results_ready',
      'results_ready': 'completed'
    };
    return statusFlow[currentStatus as keyof typeof statusFlow];
  };

  const canUpdateStatus = (status: string) => {
    return ['ordered', 'verified', 'payment_completed', 'sample_collection_scheduled', 'sample_collected', 'processing'].includes(status);
  };

  const canProcessPayment = (order: LabOrder) => {
    return ['verified', 'payment_pending', 'payment_partial'].includes(order.status) && order.dueAmount > 0;
  };

  const canUploadResults = (order: LabOrder) => {
    return order.status === 'processing' && order.dueAmount <= 0;
  };

  const handleStatusUpdate = (order: LabOrder, newStatus: string) => {
    const updateData: any = { orderId: order.id, status: newStatus };
    
    if (newStatus === 'sample_collection_scheduled') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      updateData.sampleCollectionDate = tomorrow.toISOString().split('T')[0];
      
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 3);
      updateData.expectedResultDate = expectedDate.toISOString().split('T')[0];
    }
    
    updateStatusMutation.mutate(updateData);
  };

  // Missing function definitions for unified view


  // Confirm handlers
  const handleConfirmReports = (test: any) => {
    console.log('🚀 ===== CONFIRM REPORTS CLICKED =====');
    console.log('🚀 Full test object:', test);
    console.log('🚀 Test type:', test.type);
    console.log('🚀 Test ID:', test.id);
    console.log('🚀 Test name:', test.name);
    console.log('🚀 Current status:', test.status);
    console.log('🚀 Test has sampleId:', !!test.sampleId, 'SampleId:', test.sampleId);
    console.log('🚀 Test prescriptionId:', test.prescriptionId);
    console.log('🚀 Test testReports:', test.testReports);
    console.log('🚀 Auth token present:', !!localStorage.getItem('token'));
    console.log('🚀 Axios default headers:', axios.defaults.headers.common);
    
    // Check if this is a prescription test by looking for sampleId pattern
    const isPrescriptionTest = test.sampleId && test.sampleId.startsWith('SMP-');
    console.log('🚀 Is prescription test (by sampleId):', isPrescriptionTest);
    console.log('🚀 Is prescription test (by type):', test.type === 'prescription');
    
    console.log('🔍 DECISION LOGIC:');
    console.log('🔍 test.type === "prescription":', test.type === 'prescription');
    console.log('🔍 isPrescriptionTest:', isPrescriptionTest);
    console.log('🔍 Final condition (type === prescription || isPrescriptionTest):', test.type === 'prescription' || isPrescriptionTest);
    
    if (test.type === 'prescription' || isPrescriptionTest) {
      // Use the test ID directly from the test object instead of constructing it
      const testId = test.id; // This should already be in the correct format
      console.log('📝 ===== CALLING PRESCRIPTION MUTATION =====');
      console.log('📝 Using test.id directly:', testId);
      console.log('📝 Original test.name:', test.name);
      console.log('📝 Mutation state:', {
        isPending: confirmPrescriptionMutation.isPending,
        isError: confirmPrescriptionMutation.isError,
        error: confirmPrescriptionMutation.error
      });
      console.log('📝 About to call confirmPrescriptionMutation.mutate with:', testId);
      confirmPrescriptionMutation.mutate(testId);
      console.log('📝 confirmPrescriptionMutation.mutate called');
    } else {
      console.log('📝 ===== CALLING LAB ORDER MUTATION =====');
      console.log('📝 Using orderId:', test.id);
      console.log('📝 Mutation state:', {
        isPending: confirmLabOrderMutation.isPending,
        isError: confirmLabOrderMutation.isError,
        error: confirmLabOrderMutation.error
      });
      console.log('📝 About to call confirmLabOrderMutation.mutate with:', test.id);
      confirmLabOrderMutation.mutate(test.id);
      console.log('📝 confirmLabOrderMutation.mutate called');
    }
    console.log('🚀 ===== END CONFIRM REPORTS =====');
  };

  // Revert handlers
  const handleRevertReports = (test: any) => {
    // Check if this is a prescription test by looking for sampleId pattern
    const isPrescriptionTest = test.sampleId && test.sampleId.startsWith('SMP-');
    
    if (test.type === 'prescription' || isPrescriptionTest) {
      // Construct the correct test ID format for prescription tests
      const testId = `prescription-${test.prescriptionId}-${encodeURIComponent(test.name)}`;
      revertPrescriptionMutation.mutate(testId);
    } else {
      revertLabOrderMutation.mutate(test.id);
    }
  };

  // Manual refresh function for testing
  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
    queryClient.invalidateQueries({ 
      queryKey: ['admin-prescription-lab-tests'],
      exact: false 
    });
    queryClient.refetchQueries({ queryKey: ['admin-lab-orders'] });
    queryClient.refetchQueries({ 
      queryKey: ['admin-prescription-lab-tests'],
      exact: false 
    });
  };

  // Expose handler functions to window for debugging
  if (typeof window !== 'undefined') {
    (window as any).handleConfirmReports = handleConfirmReports;
    (window as any).handleRevertReports = handleRevertReports;
    (window as any).confirmPrescriptionMutation = confirmPrescriptionMutation;
    (window as any).confirmLabOrderMutation = confirmLabOrderMutation;
    (window as any).handleManualRefresh = handleManualRefresh;
    
    // Add test function to manually test API endpoints
    (window as any).testConfirmEndpoint = async (testId: string) => {
      console.log('🧪 Testing confirm endpoint with testId:', testId);
      try {
        const response = await axios.post(`/admin/prescription-lab-tests/${testId}/confirm-reports`, {}, {
          timeout: 5000
        });
        console.log('✅ Test endpoint success:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Test endpoint error:', error);
        return error;
      }
    };
    
    // Add simple server test
    (window as any).testServer = async () => {
      console.log('🧪 Testing server connection...');
      try {
        const response = await axios.get('/admin/stats', { timeout: 3000 });
        console.log('✅ Server is responding:', response.status);
        return response.data;
      } catch (error) {
        console.error('❌ Server test failed:', error);
        return error;
      }
    };
    
    // Add function to test with the current test
    (window as any).testCurrentConfirm = () => {
      const testId = 'prescription-7-Diabetes Panel (HbA1c + Glucose)'; // Without URL encoding
      console.log('🧪 Testing with current test ID (no encoding):', testId);
      return (window as any).testConfirmEndpoint(testId);
    };
    
    // Add function to check current test status
    (window as any).checkTestStatus = () => {
      console.log('🔍 ===== CHECKING TEST STATUS =====');
      console.log('🔍 All prescription tests:', prescriptionLabTestsData?.data?.labTests?.map((t: any) => ({ id: t.id, name: t.name, status: t.status })));
      console.log('🔍 All filtered tests:', filteredTests.map((t: any) => ({ id: t.id, name: t.name, status: t.status })));
      console.log('🔍 Test categories:', categorizeTests(filteredTests));
      console.log('🔍 Diabetes Panel test:', filteredTests.find((t: any) => t.name.includes('Diabetes Panel')));
      return {
        prescriptionTests: prescriptionLabTestsData?.data?.labTests,
        filteredTests: filteredTests,
        categories: categorizeTests(filteredTests),
        diabetesTest: filteredTests.find((t: any) => t.name.includes('Diabetes Panel'))
      };
    };
  }


  const handlePaymentProcessingSubmit = () => {
    if (selectedTestForPayment && paymentProcessingData.paidAmount > 0) {
      processNewPaymentMutation.mutate({
        testId: selectedTestForPayment.id,
        ...paymentProcessingData
      });
    }
  };

  const handleApproveTest = (test: any) => {
    approveTestMutation.mutate(test.id);
  };

  const handleSampleProcessingClick = (test: any) => {
    updateToSampleProcessingMutation.mutate(test.id);
  };

  const handleSampleTakenClick = (test: any) => {
    updateToSampleTakenMutation.mutate(test.id);
  };

  // Handle cash payment entry
  const handleCashPaymentClick = (test: any) => {
    const totalAmount = parseFloat(test.totalAmount || test.price || 0);
    const currentPaidAmount = parseFloat(test.paidAmount || 0);
    const dueAmount = Math.max(0, totalAmount - currentPaidAmount); // Ensure non-negative
    
    // Debug logging removed - issue was in backend price retrieval
    
    setSelectedTestForCashPayment({
      ...test,
      totalAmount,
      paidAmount: currentPaidAmount,
      dueAmount: dueAmount
    });
    setCashPaymentData({ amount: '', notes: '' });
    setShowCashPaymentModal(true);
  };

  // Handle payment processing (payment history) click
  const handlePaymentProcessingClick = (test: any) => {
    setSelectedTestForPaymentHistory(test);
    setShowPaymentHistoryModal(true);
  };

  // Process cash payment
  const processCashPaymentMutation = useMutation({
    mutationFn: async ({ testId, amount, notes }: { testId: string, amount: number, notes: string }) => {
      if (testId.startsWith('order-')) {
        // Regular lab order
        const orderId = testId.replace('order-', '');
        return axios.post('/admin/lab-orders/cash-payment', {
          orderId,
          amount,
          notes
        });
      } else {
        // Prescription lab test
        return axios.post('/admin/prescription-tests/cash-payment', {
          testId,
          amount,
          notes
        });
      }
    },
    onSuccess: () => {
      toast.success('Cash payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-prescription-lab-tests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
      setShowCashPaymentModal(false);
      setSelectedTestForCashPayment(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record cash payment');
    }
  });

  // Handle cash payment submission
  const handleCashPaymentSubmit = () => {
    if (!selectedTestForCashPayment || !cashPaymentData.amount) return;

    const amount = parseFloat(cashPaymentData.amount);
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Validate 50% minimum requirement
    const totalAmount = parseFloat(selectedTestForCashPayment.totalAmount || selectedTestForCashPayment.price || 0);
    const currentPaidAmount = parseFloat(selectedTestForCashPayment.paidAmount || 0);
    const remainingAmount = Math.max(0, totalAmount - currentPaidAmount); // Ensure non-negative
    const totalPaidAfterPayment = currentPaidAmount + amount;
    const minimumRequired = totalAmount * 0.5;

    // Debug logging removed - validation logic is now correct

    // Validate amount is positive
    if (amount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    // Validate amount doesn't exceed remaining amount
    if (amount > remainingAmount) {
      toast.error(`Payment amount cannot exceed remaining amount of ৳${remainingAmount.toFixed(2)}`);
      return;
    }

    // Validate 50% minimum requirement (only if this is the first payment or if current payment is less than 50%)
    if (totalPaidAfterPayment < minimumRequired) {
      const additionalNeeded = minimumRequired - currentPaidAmount;
      toast.error(`Minimum 50% payment required. You need at least ৳${additionalNeeded.toFixed(2)} more to proceed to sample processing.`);
      return;
    }

    processCashPaymentMutation.mutate({
      testId: selectedTestForCashPayment.id,
      amount,
      notes: cashPaymentData.notes
    });
  };

  const handleRemoveReport = async (testId: string, reportIndex: number) => {
    try {
      // Parse testId to determine if it's a prescription test or regular order
      const isPrescription = testId.startsWith('prescription-');
      
      if (isPrescription) {
        // For prescription tests, we need to update the prescription's testReports
        const testIdParts = testId.split('-');
        const prescriptionId = testIdParts[1];
        
        const response = await axios.delete(`/admin/prescription-lab-tests/${testId}/reports/${reportIndex}`);
        
        if (response.data.success) {
          toast.success('Report removed successfully');
          // Invalidate all queries that start with 'admin-prescription-lab-tests'
          queryClient.invalidateQueries({ 
            queryKey: ['admin-prescription-lab-tests'],
            exact: false 
          });
        }
      } else {
        // For regular lab orders
        const response = await axios.delete(`/admin/lab-orders/${testId}/reports/${reportIndex}`);
        
        if (response.data.success) {
          toast.success('Report removed successfully');
          queryClient.invalidateQueries({ queryKey: ['admin-lab-orders'] });
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove report');
    }
  };

  const canViewResults = (test: any) => {
    return test.status === 'results_ready' || test.status === 'completed' || test.status === 'reported';
  };

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="page-header">Lab Test Management</h1>
            <p className="text-gray-600">
              Manage lab test orders, prescription lab tests, verify tests, process payments, and upload results
            </p>
          </div>
          <button
            onClick={handleManualRefresh}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Type
              </label>
              <select
                value={testTypeFilter}
                onChange={(e) => setTestTypeFilter(e.target.value as 'all' | 'prescribed' | 'ordered')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Tests</option>
                <option value="prescribed">Prescribed by Doctor</option>
                <option value="ordered">Ordered by Patient</option>
              </select>
              </div>
          
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="ordered">Ordered</option>
                <option value="approved">Approved</option>
                <option value="sample_processing">Sample Processing</option>
                <option value="sample_taken">Sample Taken</option>
                <option value="reported">Reported</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </div>
          
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700">Quick filters:</span>
            <button
              onClick={() => {
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                setDateFrom(yesterday.toISOString().split('T')[0]);
                setDateTo(today.toISOString().split('T')[0]);
              }}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors border border-blue-200"
            >
              Last 2 Days
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                setDateFrom(weekAgo.toISOString().split('T')[0]);
                setDateTo(today.toISOString().split('T')[0]);
              }}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors border border-blue-200"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const monthAgo = new Date(today);
                monthAgo.setDate(monthAgo.getDate() - 30);
                setDateFrom(monthAgo.toISOString().split('T')[0]);
                setDateTo(today.toISOString().split('T')[0]);
              }}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors border border-blue-200"
            >
              Last 30 Days
            </button>
          </div>
          
          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setStatusFilter('');
              setTestTypeFilter('all');
              setActiveSearchTerm('');
              setSearchTerm('');
            }}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors border border-gray-300"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Search Patient */}
      <div className="card">
        <div className="p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => {
                if (searchTerm.length >= 2 && suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => {
                // Delay hiding suggestions to allow clicking on them
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder="Search by patient name, email, doctor, or test name..."
              className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            {/* Search Button */}
            <button
              onClick={handleSearchSubmit}
              className="absolute right-12 top-1/2 transform -translate-y-1/2 bg-primary-600 text-white px-3 py-1 rounded-md text-sm hover:bg-primary-700 transition-colors"
            >
              Search
            </button>
            
            {/* Clear Button */}
            {activeSearchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
            
            {/* Search Active Indicator */}
            {activeSearchTerm && (
              <div className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
                <span className="font-medium">Searching for:</span> "{activeSearchTerm}"
                <span className="ml-2 text-blue-500">
                  ({filteredTests.length} result{filteredTests.length !== 1 ? 's' : ''} found)
                </span>
              </div>
            )}
            
            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-gray-900">{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Search Status */}
          {activeSearchTerm && (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing results for: <span className="font-medium text-primary-600">{activeSearchTerm}</span>
              </p>
              <button
                onClick={clearSearch}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear search
              </button>
            </div>
          )}
          
          {/* Search Tips */}
          {!activeSearchTerm && (
            <div className="mt-2 text-xs text-gray-500">
              💡 Tip: Type at least 2 characters to see suggestions, or press Enter to search
            </div>
          )}
        </div>
      </div>

      {/* Tabbed Interface */}
        <div className="card">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'pending', name: 'Pending', count: categorizeTests(filteredTests).pending.length, color: 'text-yellow-600 border-yellow-600' },
              { id: 'inProgress', name: 'In Progress', count: categorizeTests(filteredTests).inProgress.length, color: 'text-blue-600 border-blue-600' },
              { id: 'readyForResults', name: 'Ready for Results', count: categorizeTests(filteredTests).readyForResults.length, color: 'text-purple-600 border-purple-600' },
              { id: 'completed', name: 'Completed', count: categorizeTests(filteredTests).completed.length, color: 'text-green-600 border-green-600' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? `${tab.color}`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
                {tab.count > 0 && (
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${
                    activeTab === tab.id 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
                {/* Section-specific search and date filters */}
                <div className="mb-6 space-y-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={sectionSearchTerms[activeTab as keyof typeof sectionSearchTerms]}
                      onChange={(e) => handleSectionSearchChange(activeTab, e.target.value)}
                      placeholder={`Search in ${activeTab === 'pending' ? 'Pending' : activeTab === 'inProgress' ? 'In Progress' : activeTab === 'readyForResults' ? 'Ready for Results' : 'Completed'} tests...`}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Debug: Show total search results */}
                  {activeSearchTerm && (
                    <div className="mt-2 text-sm text-blue-600">
                      Total search results: {filteredTests.length} tests found for "{activeSearchTerm}"
                    </div>
                  )}
                  
                  {/* Date filters for current section */}
                  {(dateFrom || dateTo) && (
                    <div className="flex items-center gap-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        {dateFrom && dateTo 
                          ? `Filtering from ${new Date(dateFrom).toLocaleDateString()} to ${new Date(dateTo).toLocaleDateString()}`
                          : dateFrom 
                          ? `From ${new Date(dateFrom).toLocaleDateString()}`
                          : `Until ${new Date(dateTo).toLocaleDateString()}`
                        }
                      </span>
                      <button
                        onClick={() => {
                          setDateFrom('');
                          setDateTo('');
                        }}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Clear dates
                      </button>
                    </div>
                  )}
                </div>

          {/* Tab Content */}
          {(() => {
            const categories = categorizeTests(filteredTests);
            // Debug logs removed for performance
            // Apply section-specific search on top of already filtered tests
            const currentTests = filterTestsBySearch(
              categories[activeTab as keyof typeof categories], 
              sectionSearchTerms[activeTab as keyof typeof sectionSearchTerms]
            );

            if (currentTests.length === 0) {
              const hasActiveSearch = activeSearchTerm || sectionSearchTerms[activeTab as keyof typeof sectionSearchTerms];
              const totalResults = filteredTests.length;
              
              return (
                <div className="text-center py-12">
            <BeakerIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No {activeTab === 'pending' ? 'Pending' : activeTab === 'inProgress' ? 'In Progress' : activeTab === 'readyForResults' ? 'Ready for Results' : 'Completed'} Tests
                  </h3>
            <p className="text-gray-600">
                    {hasActiveSearch ? (
                      <>
                        No tests found in this tab matching your search criteria.
                        {totalResults > 0 && (
                          <span className="block mt-2 text-sm text-blue-600">
                            Found {totalResults} result{totalResults !== 1 ? 's' : ''} in other tabs. Try switching tabs to see them.
                          </span>
                        )}
                      </>
                    ) : (
                      `No tests in ${activeTab === 'pending' ? 'pending' : activeTab === 'inProgress' ? 'progress' : activeTab === 'readyForResults' ? 'ready for results' : 'completed'} status.`
                    )}
            </p>
          </div>
              );
            }

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentTests.map((test, index) => (
                  <TestCard key={`${test.type}-${test.id || test.prescriptionId}-${index}`} test={test} />
                ))}
        </div>
            );
          })()}
        </div>
      </div>

      {/* Legacy content for debugging - remove this section */}
      {false && (
          <div className="space-y-4">
          {filteredTests.map((test, index) => (
            <div key={`${test.type}-${test.id || test.prescriptionId}-${index}`} className="card">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                      {test.type === 'prescription' ? test.name : `Order #${test.orderNumber}`}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span><strong>Patient:</strong> {test.patientName}</span>
                      <span><strong>Doctor:</strong> {test.doctorName}</span>
                      <span>Date: {new Date(test.appointmentDate || test.createdAt).toLocaleDateString()}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        test.type === 'prescription' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {test.type === 'prescription' ? 'Prescription' : 'Patient Order'}
                        </span>
                      </div>
                    </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(test.status)}`}>
                      {formatStatus(test.status)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusBadgeColor(test.paymentStatus || 'not_paid')}`}>
                      Payment: {formatStatus(test.paymentStatus || 'not_paid')}
                    </span>
                    {test.sampleId && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-300">
                        Sample: {test.sampleId}
                      </span>
                    )}
                  </div>
                  </div>

                {/* Test Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">
                    {test.type === 'prescription' ? 'Test Details:' : 'Tests Included:'}
                  </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {test.type === 'prescription' ? (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h5 className="font-medium text-gray-900">{test.name}</h5>
                        <p className="text-sm text-gray-600">{test.description}</p>
                        <p className="text-sm font-medium text-green-600">{formatCurrency(test.price || 0)}</p>
                      </div>
                    ) : (
                      test.testDetails.map((testDetail: any, testIndex: number) => (
                        <div key={testIndex} className="bg-gray-50 p-3 rounded-lg">
                          <h5 className="font-medium text-gray-900">{testDetail.name}</h5>
                          <p className="text-sm text-gray-600">{testDetail.description}</p>
                          <p className="text-sm font-medium text-green-600">৳{testDetail.price}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Payment Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="font-semibold">{formatCurrency(test.totalAmount || test.price || 0)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Paid Amount</p>
                      <p className="font-semibold">{formatCurrency(test.paidAmount || 0)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ClockIcon className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm text-gray-600">Due Amount</p>
                      <p className="font-semibold">{formatCurrency(test.dueAmount || (test.totalAmount || test.price || 0) - (test.paidAmount || 0))}</p>
                      </div>
                    </div>
                  </div>

                {/* Management Actions */}
                  <div className="border-t pt-4">
                    <div className="flex flex-wrap gap-2">
                    
                    {/* Approval button - only show if test is ordered and not yet approved */}
                    {test.status === 'ordered' && (
                        <button
                      onClick={() => handleApproveTest(test)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        Approve Test
                        </button>
                      )}

                    {/* Payment Processing button - show payment history for all tests */}
                        <button
                      onClick={() => handlePaymentProcessingClick(test)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      <BanknotesIcon className="h-4 w-4" />
                          Payment Processing
                        </button>

                    {/* Cash Payment button - always show if there's a due amount */}
                    {(test.dueAmount || (test.totalAmount || test.price || 0) - (test.paidAmount || 0)) > 0 && (
                        <button
                      onClick={() => handleCashPaymentClick(test)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      <BanknotesIcon className="h-4 w-4" />
                          Record Cash Payment
                        </button>
                    )}

                    {/* Sample Processing button - only show if test is approved AND at least 50% is paid AND not yet processing */}
                    {test.status === 'approved' && 
                     ((test.paymentStatus || 'not_paid') === 'paid' || (test.paymentStatus || 'not_paid') === 'partially_paid') && 
                     (test.paidAmount || 0) >= (test.totalAmount || test.price || 0) * 0.5 &&
                     test.status !== 'sample_processing' && test.status !== 'sample_taken' && test.status !== 'reported' && test.status !== 'confirmed' && (
                        <button
                      onClick={() => handleSampleProcessingClick(test)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      <BeakerIcon className="h-4 w-4" />
                          Start Sample Processing
                        </button>
                    )}

                    {/* Sample Processing Status and Sample Taken button */}
                    {test.status === 'sample_processing' && (
                        <div className="space-y-2">
                          <div className="bg-purple-50 border border-purple-200 rounded-md p-3 text-center">
                            <div className="flex items-center justify-center space-x-2 text-purple-800 mb-2">
                              <BeakerIcon className="h-4 w-4" />
                              <span className="text-sm font-medium">Sample Processing Started</span>
                            </div>
                          </div>
                        <button
                      onClick={() => handleSampleTakenClick(test)}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                          Mark Sample Taken
                        </button>
                        </div>
                    )}

                    {/* Sample Taken Status and Upload Results button */}
                    {test.status === 'sample_taken' && test.status !== 'confirmed' && (
                        <div className="space-y-2">
                          
                          {/* Upload Results button - only show if payment is 100% complete */}
                          {(test.paymentStatus === 'paid' || (test.paidAmount || 0) >= (test.totalAmount || test.price || 0)) ? (
                        <button
                      onClick={() => handleUploadPrescriptionResults(test)}
                              className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
                    >
                      <ArrowUpTrayIcon className="h-4 w-4" />
                          Upload Results
                        </button>
                          ) : (
                            <div className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-3 text-center">
                              <span className="text-xs text-yellow-700 font-medium">
                                Complete payment to upload results
                              </span>
                              <p className="text-xs text-yellow-600 mt-1">
                                Paid: ৳{test.paidAmount || 0} / ৳{test.totalAmount || test.price || 0}
                              </p>
                            </div>
                          )}
                        </div>
                    )}

                    {/* Confirm Reports button - only show if test has reports and is not already confirmed */}
                    {((test.type === 'ordered' && canViewResults(test)) || 
                      (test.type === 'prescription' && test.testReports && test.testReports.length > 0 && test.testReports.some((report: any) => report.filename && report.originalName && report.path && report.originalName !== 'Poster.pdf'))) && 
                      test.status !== 'confirmed' ? (
                        <div className="space-y-2">
                        <button
                          onClick={() => handleConfirmReports(test)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Confirm & Send to Patient
                        </button>
                        </div>
                    ) : null}
                    
                    {/* View Results button */}
                    {(test.type === 'ordered' && canViewResults(test)) || 
                     (test.type === 'prescription' && test.testReports && test.testReports.length > 0 && test.testReports.some((report: any) => report.filename && report.originalName && report.path && report.originalName !== 'Poster.pdf')) ? (
                      <div className="flex flex-wrap gap-2">
                        {test.type === 'ordered' ? (
                        <button
                            onClick={() => window.open(test.resultUrl, '_blank')}
                            className="btn-outline flex items-center gap-2 text-sm"
                        >
                            <EyeIcon className="h-4 w-4" />
                            View Results
                        </button>
                        ) : (
                          test.testReports
                            .filter((report: any) => report.filename && report.originalName && report.path && report.originalName !== 'Poster.pdf') // Filter out invalid reports
                            .map((report: any, reportIndex: number) => (
                            <div key={reportIndex} className="flex items-center gap-2">
                              <a
                                href={`http://localhost:5000/${report.path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-outline flex items-center gap-2 text-sm"
                              >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                Download {report.originalName}
                              </a>
                              <button
                                onClick={() => handleRemoveReport(test.id, reportIndex)}
                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                                title="Remove this report"
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}


      {/* Upload Results Modal for Prescription Lab Tests */}
      {showPrescriptionUploadModal && selectedPrescriptionTest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Upload Test Results - {selectedPrescriptionTest.name}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Result Files (Multiple files allowed)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.dcm,.dicom,.nii,.nifti,.mhd,.raw,.img,.hdr,.vti,.vtp,.stl,.obj,.ply,.xyz,.txt,.csv,.xlsx,.xls,.doc,.docx,.rtf,.odt,.ods,.odp"
                  onChange={(e) => setUploadedFiles(e.target.files)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: PDF, Images (JPG, PNG, GIF, BMP, TIFF), DICOM, Medical imaging (NII, NIFTI, MHD), Documents (DOC, DOCX, XLS, XLSX), and more. Max size: 50MB per file
                </p>
              </div>

              {uploadedFiles && uploadedFiles.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Selected Files ({uploadedFiles.length}):</h4>
                    <button
                      type="button"
                      onClick={() => setUploadedFiles(null)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <XCircleIcon className="h-3 w-3" />
                      Clear All
                    </button>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {Array.from(uploadedFiles).map((file, index) => (
                      <li key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <DocumentTextIcon className="h-4 w-4 text-blue-500" />
                        <span className="flex-1 truncate">{file.name}</span>
                        <span className="text-gray-400 text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newFiles = Array.from(uploadedFiles).filter((_, i) => i !== index);
                            const newFileList = new DataTransfer();
                            newFiles.forEach(file => newFileList.items.add(file));
                            setUploadedFiles(newFileList.files.length > 0 ? newFileList.files : null);
                          }}
                          className="ml-2 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                          title="Remove file"
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPrescriptionUploadModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePrescriptionUploadSubmit}
                  disabled={!uploadedFiles || uploadedFiles.length === 0 || uploadPrescriptionResultsMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {uploadPrescriptionResultsMutation.isPending ? 'Uploading...' : 'Upload Results'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Processing Modal */}
      {showPaymentProcessingModal && selectedTestForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Process Payment</h3>
              <button
                onClick={() => setShowPaymentProcessingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test: {selectedTestForPayment.name}
                </label>
                <p className="text-sm text-gray-600">
                  Total Amount: {formatCurrency(selectedTestForPayment.totalAmount || selectedTestForPayment.price || 0)}
                </p>
                <p className="text-sm text-gray-600">
                  Paid Amount: {formatCurrency(selectedTestForPayment.paidAmount || 0)}
                </p>
                <p className="text-sm text-gray-600">
                  Due Amount: {formatCurrency((selectedTestForPayment.totalAmount || selectedTestForPayment.price || 0) - (selectedTestForPayment.paidAmount || 0))}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentProcessingData.paymentMethod}
                  onChange={(e) => setPaymentProcessingData({ ...paymentProcessingData, paymentMethod: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="offline">Offline Payment</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paid Amount *
                </label>
                <input
                  type="number"
                  min="0"
                  max={selectedTestForPayment.totalAmount || selectedTestForPayment.price || 0}
                  step="0.01"
                  value={paymentProcessingData.paidAmount}
                  onChange={(e) => setPaymentProcessingData({ ...paymentProcessingData, paidAmount: parseFloat(e.target.value) || 0 })}
                  className="input-field w-full"
                  placeholder="Enter paid amount"
                />
              </div>

              {paymentProcessingData.paymentMethod === 'online' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction ID *
                  </label>
                  <input
                    type="text"
                    value={paymentProcessingData.transactionId}
                    onChange={(e) => setPaymentProcessingData({ ...paymentProcessingData, transactionId: e.target.value })}
                    className="input-field w-full"
                    placeholder="Enter transaction ID"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={paymentProcessingData.notes}
                  onChange={(e) => setPaymentProcessingData({ ...paymentProcessingData, notes: e.target.value })}
                  className="input-field w-full"
                  placeholder="Add any notes..."
                />
              </div>

              {paymentProcessingData.paidAmount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Payment Rules:</strong>
                  </p>
                  <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
                    <li>Minimum 50% payment required to proceed</li>
                    <li>Full payment required to access results</li>
                    <li>Partial payment allows sample processing only</li>
                  </ul>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPaymentProcessingModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentProcessingSubmit}
                  disabled={paymentProcessingData.paidAmount <= 0 || 
                           (paymentProcessingData.paymentMethod === 'online' && !paymentProcessingData.transactionId) ||
                           processNewPaymentMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {processNewPaymentMutation.isPending ? 'Processing...' : 'Process Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash Payment Modal */}
      {showCashPaymentModal && selectedTestForCashPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Record Cash Payment - {selectedTestForCashPayment.name}
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="font-medium">৳{selectedTestForCashPayment.totalAmount || selectedTestForCashPayment.price || 0}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Paid Amount:</span>
                  <span className="font-medium text-green-600">৳{selectedTestForCashPayment.paidAmount || 0}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Remaining:</span>
                  <span className="font-medium text-red-600">৳{selectedTestForCashPayment.dueAmount || 0}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cash Amount Received
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedTestForCashPayment.dueAmount || 0}
                  value={cashPaymentData.amount}
                  onChange={(e) => setCashPaymentData({ ...cashPaymentData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter cash amount received"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: ৳{selectedTestForCashPayment.dueAmount || 0}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Minimum 50% required for sample processing: ৳{((selectedTestForCashPayment.totalAmount || selectedTestForCashPayment.price || 0) * 0.5).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={cashPaymentData.notes}
                  onChange={(e) => setCashPaymentData({ ...cashPaymentData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="Add any notes about this cash payment..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCashPaymentModal(false);
                  setSelectedTestForCashPayment(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCashPaymentSubmit}
                disabled={processCashPaymentMutation.isPending || !cashPaymentData.amount}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {processCashPaymentMutation.isPending ? 'Recording...' : 'Record Cash Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showPaymentHistoryModal && selectedTestForPaymentHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Payment History - {selectedTestForPaymentHistory.name}
            </h3>
            
            <div className="space-y-4">
              {/* Payment Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="font-medium">৳{selectedTestForPaymentHistory.totalAmount || selectedTestForPaymentHistory.price || 0}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Paid Amount:</span>
                  <span className="font-medium text-green-600">৳{selectedTestForPaymentHistory.paidAmount || 0}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Remaining:</span>
                  <span className="font-medium text-red-600">৳{(selectedTestForPaymentHistory.totalAmount || selectedTestForPaymentHistory.price || 0) - (selectedTestForPaymentHistory.paidAmount || 0)}</span>
                </div>
              </div>

              {/* Payment History List */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Payment Records:</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedTestForPaymentHistory.payments && selectedTestForPaymentHistory.payments.length > 0 ? (
                    selectedTestForPaymentHistory.payments.map((payment: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              payment.paymentMethod === 'cash' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {payment.paymentMethod === 'cash' ? 'Cash Payment' : 'Online Payment'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              payment.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {payment.status}
                            </span>
                          </div>
                          <span className="font-semibold text-green-600">৳{payment.amount}</span>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          {payment.transactionId && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Transaction ID:</span>
                              <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">{payment.transactionId}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Date:</span>
                            <span>{new Date(payment.paidAt).toLocaleString()}</span>
                          </div>
                          {payment.notes && (
                            <div className="flex items-start gap-2">
                              <span className="font-medium">Notes:</span>
                              <span>{payment.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <BanknotesIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No payment records found</p>
                      <p className="text-sm">Payments will appear here once made by the patient</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPaymentHistoryModal(false);
                  setSelectedTestForPaymentHistory(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
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

export default AdminLabReports;
