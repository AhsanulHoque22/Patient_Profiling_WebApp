import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../services/paymentService';
import UnifiedTestSelection from '../components/UnifiedTestSelection';
import { 
  BanknotesIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  ArrowPathIcon,
  CreditCardIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface LabOrder {
  id: number;
  orderNumber: string;
  patientId: number;
  doctorId?: number;
  appointmentId?: number;
  testIds: number[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  paymentMethod?: string;
  sampleCollectionDate?: string;
  expectedResultDate?: string;
  resultUrl?: string;
  sampleId?: string;
  testReports?: Array<{
    filename: string;
    originalName: string;
    path: string;
    uploadedAt: string;
  }>;
  notes?: string;
  verifiedAt?: string;
  verifiedBy?: number;
  createdAt: string;
  updatedAt: string;
  patient: {
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  doctor?: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  appointment?: {
    appointmentDate: string;
    doctor: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
  };
  payments?: Array<{
    id: number;
    amount: number;
    paymentMethod: string;
    transactionId?: string;
    status: string;
    paidAt: string;
    processedBy: number;
    notes?: string;
  }>;
  testDetails: Array<{
    id: number;
    name: string;
    description?: string;
    price: number;
    category: string;
  }>;
}

interface PrescriptionLabTest {
  id: string;
  name: string;
  description: string;
  price: number;
  status: string;
  type: string;
  prescriptionId: number;
  appointmentDate: string;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  createdAt: string;
  testReports?: Array<{
    id: string;
    originalName: string;
    path: string;
    uploadedAt: string;
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    paymentMethod: string;
    transactionId?: string;
    status: string;
    paidAt: string;
    processedBy: number;
    notes?: string;
  }>;
}

const LabReports: React.FC = () => {
  const queryClient = useQueryClient();

  // State management
  const [activeTab, setActiveTab] = useState<'unified' | 'individual'>('unified');
  const [statusFilter, setStatusFilter] = useState('');
  const [testTypeFilter, setTestTypeFilter] = useState<'all' | 'prescribed' | 'ordered'>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPrescriptionPaymentModal, setShowPrescriptionPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [selectedPrescriptionTest, setSelectedPrescriptionTest] = useState<PrescriptionLabTest | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    transactionId: '',
    notes: ''
  });

  // Fetch lab test orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery<any>({
    queryKey: ['lab-orders'],
    queryFn: async () => {
      const response = await axios.get('/lab-tests/orders?limit=100', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      return response.data;
    },
    staleTime: 5000, // Cache for 5 seconds
    gcTime: 10000, // Keep in memory for 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch prescription lab tests
  const { data: prescriptionLabTestsData, isLoading: prescriptionLoading } = useQuery<any>({
    queryKey: ['prescription-lab-tests'],
    queryFn: async () => {
      const response = await axios.get('/lab-tests/prescription-tests?limit=100', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      return response.data;
    },
    staleTime: 5000, // Cache for 5 seconds
    gcTime: 10000, // Keep in memory for 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Payment mutation for regular lab orders
  const paymentMutation = useMutation({
    mutationFn: async (paymentData: { orderId: number; amount: number; paymentMethod: string; transactionId?: string; notes?: string }) => {
      const response = await axios.post(`/lab-tests/orders/${paymentData.orderId}/payment`, paymentData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Payment processed successfully!');
      setShowPaymentModal(false);
      setSelectedOrder(null);
      setPaymentForm({ amount: '', paymentMethod: 'cash', transactionId: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Payment failed');
    }
  });

  // Payment mutation for prescription lab tests
  const prescriptionPaymentMutation = useMutation({
    mutationFn: async (paymentData: { testId: string; amount: number; paymentMethod: string; transactionId?: string; notes?: string }) => {
      const response = await axios.post(`/lab-tests/prescription-tests/${paymentData.testId}/payment`, paymentData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Payment processed successfully!');
      setShowPrescriptionPaymentModal(false);
      setSelectedPrescriptionTest(null);
      setPaymentForm({ amount: '', paymentMethod: 'cash', transactionId: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['prescription-lab-tests'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Payment failed');
    }
  });

  // Helper function to get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ordered': return 'bg-slate-100 text-slate-800 border border-slate-300';
      case 'approved': return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      case 'sample_processing': return 'bg-purple-100 text-purple-800 border border-purple-300';
      case 'sample_taken': return 'bg-indigo-100 text-indigo-800 border border-indigo-300';
      case 'reported': return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'confirmed': return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-300';
      default: return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'not_paid': return 'bg-red-100 text-red-800 border border-red-300';
      case 'partially_paid': return 'bg-orange-100 text-orange-800 border border-orange-300';
      case 'paid': return 'bg-green-100 text-green-800 border border-green-300';
      default: return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  // Helper function to format status
  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ordered': return <ClockIcon className="h-4 w-4" />;
      case 'approved': return <CheckCircleIcon className="h-4 w-4" />;
      case 'sample_processing': return <ArrowPathIcon className="h-4 w-4" />;
      case 'sample_taken': return <PlayIcon className="h-4 w-4" />;
      case 'reported': return <ArrowDownTrayIcon className="h-4 w-4" />;
      case 'confirmed': return <CheckCircleIcon className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  // Helper function to check if payment is allowed
  const canMakePayment = (test: any) => {
    const paymentStatus = test.paymentStatus || 'not_paid';
    // Payment is only allowed if:
    // 1. Test is approved by admin (not 'ordered')
    // 2. Payment is not fully paid
    return paymentStatus !== 'paid' && test.status !== 'ordered';
  };

  // Helper function to check if reports are available for download
  const canDownloadReports = (test: any) => {
    // Check if test has reports and is in a status where reports should be available
    const hasReports = (test.testReports && test.testReports.length > 0) || 
                      (test.type === 'ordered' && test.resultUrl);
    const reportAvailableStatuses = ['reported', 'confirmed', 'results_ready', 'completed'];
    
    return hasReports && reportAvailableStatuses.includes(test.status);
  };

  // Helper function to get remaining amount
  const getRemainingAmount = (test: any) => {
    // For regular lab orders, use the dueAmount field directly
    if (test.type === 'ordered' && test.dueAmount !== undefined) {
      return parseFloat(String(test.dueAmount || 0));
    }
    
    // For prescription lab tests, calculate from payments
    const totalAmount = parseFloat(String(test.price || test.totalAmount || 0));
    const paidAmount = test.payments ? test.payments.reduce((sum: number, payment: any) => {
      return sum + parseFloat(String(payment.amount || 0));
    }, 0) : parseFloat(String(test.paidAmount || 0));
    
    return Math.max(0, totalAmount - paidAmount);
  };

  // Helper function to get paid amount
  const getPaidAmount = (test: any) => {
    // For regular lab orders, use the paidAmount field directly
    if (test.type === 'ordered' && test.paidAmount !== undefined) {
      return parseFloat(String(test.paidAmount || 0));
    }
    
    // For prescription lab tests, calculate from payments array
    if (test.payments && test.payments.length > 0) {
      return test.payments.reduce((sum: number, payment: any) => {
        return sum + parseFloat(String(payment.amount || 0));
      }, 0);
    }
    return parseFloat(String(test.paidAmount || 0));
  };

  // Helper function to get total amount
  const getTotalAmount = (test: any) => {
    return parseFloat(String(test.price || test.totalAmount || 0));
  };

  // Handle payment for regular lab orders
  const handlePayment = (order: LabOrder) => {
    setSelectedOrder(order);
    setPaymentForm({
      amount: order.dueAmount.toString(),
      paymentMethod: 'bkash',
      transactionId: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  // Handle payment for prescription lab tests
  const handlePrescriptionPayment = (test: PrescriptionLabTest) => {
    setSelectedPrescriptionTest(test);
    const remainingAmount = getRemainingAmount(test);
    setPaymentForm({
      amount: remainingAmount.toString(),
      paymentMethod: 'bkash',
      transactionId: '',
      notes: ''
    });
    setShowPrescriptionPaymentModal(true);
  };


  // Process payment for regular lab orders
  const processPayment = async () => {
    if (!selectedOrder || !paymentForm.amount) return;

    const amount = parseFloat(paymentForm.amount);
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // For cash payments, don't process here - just show instruction
    if (paymentForm.paymentMethod === 'cash') {
      toast('Please pay the cash amount to the admin. Admin will process your payment.', {
        icon: '💡',
        duration: 4000,
      });
      setShowPaymentModal(false);
      return;
    }

    // Check if total paid amount (including current payment) meets 50% requirement for online payments
    const totalPaidAfterPayment = selectedOrder.paidAmount + amount;
    const minimumRequired = selectedOrder.totalAmount * 0.5;
    
    if (totalPaidAfterPayment < minimumRequired) {
      toast.error(`Minimum 50% payment required for sample processing. You need to pay at least ${formatCurrency(minimumRequired - selectedOrder.paidAmount)} more.`);
      return;
    }

    paymentMutation.mutate({
      orderId: selectedOrder.id,
      amount: amount,
      paymentMethod: paymentForm.paymentMethod,
      transactionId: paymentForm.transactionId,
      notes: paymentForm.notes
    });
  };

  // Process payment for prescription lab tests
  const processPrescriptionPayment = async () => {
    if (!selectedPrescriptionTest || !paymentForm.amount) return;

    const amount = parseFloat(paymentForm.amount);
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // For cash payments, don't process here - just show instruction
    if (paymentForm.paymentMethod === 'cash') {
      toast('Please pay the cash amount to the admin. Admin will process your payment.', {
        icon: '💡',
        duration: 4000,
      });
      setShowPrescriptionPaymentModal(false);
      return;
    }

    const remainingAmount = getRemainingAmount(selectedPrescriptionTest);
    if (amount > remainingAmount) {
      toast.error(`Payment amount cannot exceed remaining amount of ${formatCurrency(remainingAmount)}`);
      return;
    }

    // Check if total paid amount (including current payment) meets 50% requirement for online payments
    const totalPaidAfterPayment = getPaidAmount(selectedPrescriptionTest) + amount;
    const minimumRequired = getTotalAmount(selectedPrescriptionTest) * 0.5;
    
    if (totalPaidAfterPayment < minimumRequired) {
      toast.error(`Minimum 50% payment required for sample processing. You need to pay at least ${formatCurrency(minimumRequired - getPaidAmount(selectedPrescriptionTest))} more.`);
      return;
    }

    prescriptionPaymentMutation.mutate({
      testId: selectedPrescriptionTest.id,
      amount: amount,
      paymentMethod: paymentForm.paymentMethod,
      transactionId: paymentForm.transactionId,
      notes: paymentForm.notes
    });
  };

  // Combine and filter all tests
  const getAllTests = () => {
    const allTests: any[] = [];


    // Add prescription lab tests
    if (prescriptionLabTestsData?.data?.labTests) {
      prescriptionLabTestsData.data.labTests.forEach((test: PrescriptionLabTest) => {
        allTests.push({
          ...test,
          type: 'prescription',
          orderNumber: `PRES-${test.prescriptionId}`,
          createdAt: test.createdAt
        });
      });
    }

    // Add regular lab orders
    if (ordersData?.data?.orders) {
      ordersData.data.orders.forEach((order: LabOrder) => {
        allTests.push({
          ...order,
          type: 'ordered',
          doctorName: order.appointment?.doctor ? 
            `${order.appointment.doctor.user.firstName} ${order.appointment.doctor.user.lastName}` : 
            'Self-Ordered',
          appointmentDate: order.createdAt,
          prescriptionId: null
        });
      });
    }

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


    return filteredTests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const allTests = getAllTests();
  const isLoading = ordersLoading || prescriptionLoading;

  // Debug logging
  console.log('Lab Reports Debug:', {
    statusFilter,
    testTypeFilter,
    ordersData: ordersData?.data?.orders?.length || 0,
    prescriptionData: prescriptionLabTestsData?.data?.labTests?.length || 0,
    allTests: allTests.length,
    reportedTests: allTests.filter(test => test.status === 'reported').length,
    allStatuses: Array.from(new Set(allTests.map(test => test.status))),
    firstFewTests: allTests.slice(0, 3).map(test => ({
      id: test.id,
      name: test.name || test.orderNumber,
      status: test.status,
      type: test.type
    }))
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lab reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lab Reports</h1>
            <p className="mt-2 text-gray-600">View and manage your lab test reports and payments</p>
          </div>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
              queryClient.invalidateQueries({ queryKey: ['prescription-lab-tests'] });
              queryClient.invalidateQueries({ queryKey: ['pending-lab-payments'] });
              toast.success('Data refreshed!');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('unified')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'unified'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <CreditCardIcon className="h-5 w-5" />
                  <span>Unified Payments</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('individual')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'individual'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="h-5 w-5" />
                  <span>Individual Reports</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'unified' && (
          <div className="mb-6">
            <UnifiedTestSelection />
          </div>
        )}

        {activeTab === 'individual' && (
          <>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <option value="ordered">Self-Ordered</option>
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
                <option value="">All Statuses</option>
            <option value="ordered">Ordered</option>
                <option value="approved">Approved</option>
            <option value="verified">Verified</option>
            <option value="payment_pending">Payment Pending</option>
                <option value="payment_partial">Partially Paid</option>
                <option value="paid">Paid</option>
            <option value="reported">Reported</option>
            <option value="confirmed">Confirmed</option>
            <option value="sample_collected">Sample Collected</option>
            <option value="processing">Processing</option>
            <option value="results_ready">Results Ready</option>
            <option value="completed">Completed</option>
          </select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-500">
                {allTests.length} test{allTests.length !== 1 ? 's' : ''} found
              </div>
            </div>
        </div>
      </div>

        {/* Tests List */}
        {allTests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No lab tests found</h3>
            <p className="text-gray-500">
              {statusFilter || testTypeFilter !== 'all' 
                ? 'Try adjusting your filters to see more results.'
                : 'You haven\'t ordered any lab tests yet.'}
            </p>
        </div>
      ) : (
          <div className="space-y-6">
            {allTests.map((test) => {
              const totalAmount = getTotalAmount(test);
              const paidAmount = getPaidAmount(test);
              const remainingAmount = getRemainingAmount(test);
              const canPay = canMakePayment(test);

              return (
                <div key={test.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                            {test.type === 'prescription' ? test.name : `Order #${test.orderNumber}`}
                    </h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(test.status)}`}>
                              {getStatusIcon(test.status)}
                              <span className="ml-1">{formatStatus(test.status)}</span>
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadgeColor(test.paymentStatus || 'not_paid')}`}>
                              Payment: {formatStatus(test.paymentStatus || 'not_paid')}
                            </span>
                            {test.sampleId && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                                Sample ID: {test.sampleId}
                              </span>
                            )}
                            <span className="text-sm text-gray-500">
                              {test.type === 'prescription' ? 'Prescription' : 'Self-Ordered'}
                  </span>
                          </div>
                        </div>
                </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-500">Total Amount</div>
                        <div className="text-lg font-semibold text-gray-900">{formatCurrency(totalAmount)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Test Details */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">
                          {test.type === 'prescription' ? 'Test Details' : 'Tests Included'}
                        </h4>
                        {test.type === 'prescription' ? (
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm font-medium text-gray-700">Name:</span>
                              <p className="text-sm text-gray-600">{test.name}</p>
                            </div>
                            {test.description && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">Description:</span>
                                <p className="text-sm text-gray-600">{test.description}</p>
                              </div>
                            )}
                            <div>
                              <span className="text-sm font-medium text-gray-700">Doctor:</span>
                              <p className="text-sm text-gray-600">{test.doctorName}</p>
                            </div>
                    <div>
                              <span className="text-sm font-medium text-gray-700">Date:</span>
                              <p className="text-sm text-gray-600">
                                {new Date(test.appointmentDate).toLocaleDateString()}
                              </p>
                    </div>
                  </div>
                        ) : (
                          <div className="space-y-2">
                            {test.testDetails?.map((testDetail: any, index: number) => (
                              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex justify-between items-start">
                    <div>
                                    <p className="font-medium text-gray-900">{testDetail.name}</p>
                                    <p className="text-sm text-gray-600">{testDetail.category}</p>
                                  </div>
                                  <span className="text-sm font-medium text-green-600">
                                    {formatCurrency(testDetail.price)}
                                  </span>
                    </div>
                  </div>
                            ))}
                          </div>
                        )}
                </div>

                      {/* Payment Information */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Payment Information</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Amount:</span>
                            <span className="text-sm font-medium">{formatCurrency(totalAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Paid Amount:</span>
                            <span className="text-sm font-medium text-green-600">{formatCurrency(paidAmount)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-sm font-medium text-gray-900">Remaining:</span>
                            <span className={`text-sm font-medium ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(remainingAmount)}
                            </span>
                          </div>
                        </div>
                  </div>

                      {/* Actions */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Actions</h4>
                        <div className="space-y-2">
                          {canPay && remainingAmount > 0 && (
                            <>
                              <button
                                onClick={() => test.type === 'prescription' ? handlePrescriptionPayment(test) : handlePayment(test)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
                              >
                                <BanknotesIcon className="h-4 w-4" />
                                <span>
                                  {paidAmount > 0 ? 'Pay Remaining' : 'Pay Now'}
                                </span>
                              </button>
                              
                            </>
                          )}

                          {test.type === 'prescription' && test.status === 'ordered' && (
                            <div className="w-full bg-amber-50 border border-amber-200 rounded-md p-3 text-center">
                              <div className="flex items-center justify-center space-x-2 text-amber-800">
                                <ClockIcon className="h-4 w-4" />
                                <span className="text-sm font-medium">Waiting for Admin Approval</span>
                              </div>
                              <p className="text-xs text-amber-700 mt-1">
                                Payment will be available once approved by admin
                              </p>
                            </div>
                          )}
                          
                          {/* Show download buttons for prescription tests with reports */}
                          {test.type === 'prescription' && canDownloadReports(test) && (
                            <div className="space-y-1">
                              {test.status === 'confirmed' && (
                                <div className="w-full bg-emerald-50 border border-emerald-200 rounded-md p-2 text-center mb-2">
                                  <div className="flex items-center justify-center space-x-2 text-emerald-800">
                                    <CheckCircleIcon className="h-4 w-4" />
                                    <span className="text-sm font-medium">Reports Finalized & Sent</span>
                                  </div>
                                </div>
                              )}
                              {test.testReports.map((report: any, index: number) => (
                                <a
                                  key={index}
                                  href={`http://localhost:5000/${report.path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
                                >
                                  <ArrowDownTrayIcon className="h-4 w-4" />
                                  <span>Download {report.originalName || `Report ${index + 1}`}</span>
                                </a>
                              ))}
                            </div>
                          )}
                          
                          {/* Show download buttons for regular lab orders with reports */}
                          {test.type === 'ordered' && canDownloadReports(test) && (
                            <div className="space-y-1">
                              {test.status === 'confirmed' && (
                                <div className="w-full bg-emerald-50 border border-emerald-200 rounded-md p-2 text-center mb-2">
                                  <div className="flex items-center justify-center space-x-2 text-emerald-800">
                                    <CheckCircleIcon className="h-4 w-4" />
                                    <span className="text-sm font-medium">Reports Finalized & Sent</span>
                                  </div>
                                </div>
                              )}
                              {/* Handle multiple files stored in testReports */}
                              {test.testReports && test.testReports.length > 0 ? (
                                test.testReports.map((report: any, index: number) => (
                                <a
                                  key={index}
                                  href={`http://localhost:5000/${report.path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
                                >
                                  <ArrowDownTrayIcon className="h-4 w-4" />
                                  <span>Download {report.originalName || `Report ${index + 1}`}</span>
                                </a>
                                ))
                              ) : test.resultUrl ? (
                                // Handle legacy single file in resultUrl
                                (() => {
                                  try {
                                    // Try to parse as JSON (multiple files)
                                    const files = JSON.parse(test.resultUrl);
                                    if (Array.isArray(files)) {
                                      return files.map((file: any, index: number) => (
                                      <a
                                        key={index}
                                        href={`http://localhost:5000/${file.path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
                                      >
                                        <ArrowDownTrayIcon className="h-4 w-4" />
                                        <span>Download {file.originalName || `Report ${index + 1}`}</span>
                                      </a>
                                      ));
                                    }
                                  } catch (e) {
                                    // Not JSON, treat as single file URL
                                    return (
                                      <a
                                        href={`http://localhost:5000${test.resultUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
                                      >
                                        <ArrowDownTrayIcon className="h-4 w-4" />
                                        <span>Download Report</span>
                                      </a>
                                    );
                                  }
                                })()
                              ) : null}
                            </div>
                          )}
                  </div>
                </div>
              </div>
            </div>
                </div>
              );
            })}
                                  </div>
        )}

        {/* Payment Modal for Regular Lab Orders */}
        {showPaymentModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Make Payment - Order #{selectedOrder.orderNumber}
              </h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Total Amount:</span>
                    <span className="font-medium">{formatCurrency(selectedOrder.totalAmount)}</span>
                                </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Paid Amount:</span>
                    <span className="font-medium text-green-600">{formatCurrency(selectedOrder.paidAmount)}</span>
                              </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium">Remaining:</span>
                    <span className="font-medium text-red-600">{formatCurrency(selectedOrder.dueAmount)}</span>
                    </div>
            </div>
            
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedOrder.dueAmount}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter payment amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: {formatCurrency(selectedOrder.dueAmount)}
                  </p>
                  {paymentForm.paymentMethod === 'cash' ? (
                    <p className="text-xs text-blue-600 mt-1">
                      💡 Cash payment will be processed by admin after you pay at the counter
                    </p>
                  ) : (
                    <p className="text-xs text-orange-600 mt-1">
                      Minimum 50% required for sample processing: {formatCurrency(selectedOrder.totalAmount * 0.5)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value, transactionId: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cash">Cash (Pay at Counter)</option>
                    <option value="bkash">Online Payment (bKash)</option>
                    <option value="bank_card">Online Payment (Bank Card)</option>
                  </select>
                </div>

                {(paymentForm.paymentMethod === 'bkash' || paymentForm.paymentMethod === 'bank_card') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transaction ID *
                    </label>
                    <input
                      type="text"
                      value={paymentForm.transactionId}
                      onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter transaction ID"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Required for online payments. Please provide the transaction ID from your payment confirmation.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Add any notes..."
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={processPayment}
                  disabled={paymentMutation.isPending || 
                           !paymentForm.amount ||
                           ((paymentForm.paymentMethod === 'bkash' || paymentForm.paymentMethod === 'bank_card') && !paymentForm.transactionId)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {paymentMutation.isPending ? 'Processing...' : 'Make Payment'}
                </button>
            </div>
          </div>
        </div>
      )}

        {/* Payment Modal for Prescription Lab Tests */}
        {showPrescriptionPaymentModal && selectedPrescriptionTest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Make Payment - {selectedPrescriptionTest.name}
              </h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Total Amount:</span>
                    <span className="font-medium">{formatCurrency(getTotalAmount(selectedPrescriptionTest))}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Paid Amount:</span>
                    <span className="font-medium text-green-600">{formatCurrency(getPaidAmount(selectedPrescriptionTest))}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium">Remaining:</span>
                    <span className="font-medium text-red-600">{formatCurrency(getRemainingAmount(selectedPrescriptionTest))}</span>
                    </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={getRemainingAmount(selectedPrescriptionTest)}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter payment amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: {formatCurrency(getRemainingAmount(selectedPrescriptionTest))}
                  </p>
                  {paymentForm.paymentMethod === 'cash' ? (
                    <p className="text-xs text-blue-600 mt-1">
                      💡 Cash payment will be processed by admin after you pay at the counter
                    </p>
                  ) : (
                    <p className="text-xs text-orange-600 mt-1">
                      Minimum 50% required for sample processing: {formatCurrency(getTotalAmount(selectedPrescriptionTest) * 0.5)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value, transactionId: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cash">Cash (Pay at Counter)</option>
                    <option value="bkash">Online Payment (bKash)</option>
                    <option value="bank_card">Online Payment (Bank Card)</option>
                  </select>
                    </div>
                    
                {(paymentForm.paymentMethod === 'bkash' || paymentForm.paymentMethod === 'bank_card') && (
                      <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction ID *
                  </label>
                  <input
                    type="text"
                    value={paymentForm.transactionId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter transaction ID"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required for online payments. Please provide the transaction ID from your payment confirmation.
                  </p>
                </div>
                )}

                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Add any notes..."
                  />
              </div>
            </div>
            
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowPrescriptionPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={processPrescriptionPayment}
                  disabled={prescriptionPaymentMutation.isPending || 
                           !paymentForm.amount ||
                           ((paymentForm.paymentMethod === 'bkash' || paymentForm.paymentMethod === 'bank_card') && !paymentForm.transactionId)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {prescriptionPaymentMutation.isPending ? 'Processing...' : 'Make Payment'}
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}

        </div>
    </div>
  );
};

export default LabReports;