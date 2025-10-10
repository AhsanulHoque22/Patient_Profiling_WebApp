import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  BeakerIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  CurrencyDollarIcon,
  QrCodeIcon,
  UserIcon,
  CalendarIcon,
  PlayIcon,
  EyeIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface UnifiedOrder {
  id: number;
  orderNumber: string;
  barcode: string;
  patientId: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  paymentStatus: string;
  paymentThreshold: number;
  sampleAllowed: boolean;
  createdAt: string;
  notes?: string;
  patient: {
    id: number;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
  };
  orderItems: Array<{
    id: number;
    testName: string;
    unitPrice: number;
    status: string;
    isSelected: boolean;
    sampleAllowed: boolean;
    labTest: {
      id: number;
      name: string;
      description: string;
      category: string;
    };
  }>;
}

const AdminUnifiedOrderManagement: React.FC = () => {
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCashPaymentModal, setShowCashPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const queryClient = useQueryClient();

  // Fetch unified orders
  const { data: ordersData, isLoading } = useQuery<{ orders: UnifiedOrder[] }>({
    queryKey: ['adminUnifiedOrders', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const response = await axios.get(`/admin/unified-lab-orders?${params.toString()}`);
      return response.data.data; // Extract data from the nested structure
    }
  });

  // Approve order items mutation
  const approveOrderItemsMutation = useMutation({
    mutationFn: async ({ orderId, itemIds }: { orderId: number; itemIds: number[] }) => {
      const response = await axios.post(`/admin/unified-orders/${orderId}/approve`, {
        itemIds
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Order items approved successfully!');
      queryClient.invalidateQueries({ queryKey: ['adminUnifiedOrders'] });
      setShowDetailsModal(false);
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve order items');
    }
  });

  // Start processing mutation (50% payment threshold)
  const startProcessingMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: number }) => {
      const response = await axios.post(`/admin/unified-orders/${orderId}/start-processing`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Sample processing started!');
      queryClient.invalidateQueries({ queryKey: ['adminUnifiedOrders'] });
      setShowDetailsModal(false);
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start processing');
    }
  });

  const recordCashPaymentMutation = useMutation({
    mutationFn: async ({ orderId, amount, notes }: { orderId: number; amount: number; notes?: string }) => {
      const response = await axios.post(`/admin/unified-orders/${orderId}/cash-payment`, { amount, notes });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Cash payment recorded successfully!');
      queryClient.invalidateQueries({ queryKey: ['adminUnifiedOrders'] });
      setShowCashPaymentModal(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record cash payment');
    }
  });

  const uploadResultsMutation = useMutation({
    mutationFn: async ({ orderId, files, notes }: { orderId: number; files: FileList; notes?: string }) => {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      if (notes) formData.append('notes', notes);
      
      const response = await axios.post(`/admin/unified-orders/${orderId}/upload-results`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Results uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['adminUnifiedOrders'] });
      setShowUploadModal(false);
      setUploadFiles(null);
      setUploadNotes('');
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload results');
    }
  });

  const confirmReportsMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: number }) => {
      const response = await axios.post(`/admin/unified-orders/${orderId}/confirm-reports`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Reports confirmed successfully!');
      queryClient.invalidateQueries({ queryKey: ['adminUnifiedOrders'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to confirm reports');
    }
  });

  const revertReportsMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: number }) => {
      const response = await axios.post(`/admin/unified-orders/${orderId}/revert-reports`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Reports reverted successfully!');
      queryClient.invalidateQueries({ queryKey: ['adminUnifiedOrders'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to revert reports');
    }
  });

  const handleViewDetails = (order: UnifiedOrder) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleApproveOrder = () => {
    if (!selectedOrder) return;
    
    const itemIds = selectedOrder.orderItems
      .filter(item => item.status === 'ordered')
      .map(item => item.id);
    
    if (itemIds.length === 0) {
      toast.error('No items to approve');
      return;
    }

    approveOrderItemsMutation.mutate({
      orderId: selectedOrder.id,
      itemIds
    });
  };

  const handleStartProcessing = () => {
    if (!selectedOrder) return;
    startProcessingMutation.mutate({ orderId: selectedOrder.id });
  };

  const handleCashPayment = (order: UnifiedOrder) => {
    setSelectedOrder(order);
    setShowCashPaymentModal(true);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const handleRecordCashPayment = () => {
    if (!selectedOrder || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    if (amount > selectedOrder.dueAmount) {
      toast.error(`Payment amount cannot exceed remaining amount of ${formatCurrency(selectedOrder.dueAmount)}`);
      return;
    }

    recordCashPaymentMutation.mutate({
      orderId: selectedOrder.id,
      amount,
      notes: paymentNotes || undefined
    });
  };

  const handleUploadResults = (order: UnifiedOrder) => {
    setSelectedOrder(order);
    setShowUploadModal(true);
    setUploadFiles(null);
    setUploadNotes('');
  };

  const handleUploadFiles = () => {
    if (!selectedOrder || !uploadFiles || uploadFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    uploadResultsMutation.mutate({
      orderId: selectedOrder.id,
      files: uploadFiles,
      notes: uploadNotes || undefined
    });
  };

  const handleConfirmReports = (order: UnifiedOrder) => {
    confirmReportsMutation.mutate({ orderId: order.id });
  };

  const handleRevertReports = (order: UnifiedOrder) => {
    if (window.confirm('Are you sure you want to revert the reports? This action cannot be undone.')) {
      revertReportsMutation.mutate({ orderId: order.id });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT'
    }).format(amount);
  };

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      'ordered': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      'verified': 'bg-blue-100 text-blue-800 border border-blue-300',
      'payment_pending': 'bg-orange-100 text-orange-800 border border-orange-300',
      'payment_partial': 'bg-amber-100 text-amber-800 border border-amber-300',
      'payment_completed': 'bg-green-100 text-green-800 border border-green-300',
      'sample_collection_scheduled': 'bg-purple-100 text-purple-800 border border-purple-300',
      'sample_collected': 'bg-indigo-100 text-indigo-800 border border-indigo-300',
      'processing': 'bg-blue-100 text-blue-800 border border-blue-300',
      'results_ready': 'bg-green-100 text-green-800 border border-green-300',
      'completed': 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      'cancelled': 'bg-red-100 text-red-800 border border-red-300'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border border-gray-300';
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const canApprove = (order: UnifiedOrder) => {
    return order.orderItems.some(item => item.status === 'ordered');
  };

  const canStartProcessing = (order: UnifiedOrder) => {
    const hasApprovedItems = order.orderItems.some(item => item.status === 'approved');
    const paymentThreshold = order.paidAmount >= (order.totalAmount * 0.5); // 50% for processing
    return hasApprovedItems && paymentThreshold && order.status === 'verified';
  };

  const canUploadResults = (order: UnifiedOrder) => {
    return order.paidAmount >= order.totalAmount; // 100% for results upload
  };

  const orders = ordersData?.orders || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BeakerIcon className="h-8 w-8 text-indigo-500 mr-3" />
              Unified Lab Orders
            </h2>
            <p className="text-gray-600 mt-1">
              Manage and approve unified lab test orders
            </p>
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Status</option>
              <option value="ordered">Ordered</option>
              <option value="verified">Verified</option>
              <option value="processing">Processing</option>
              <option value="sample_collected">Sample Collected</option>
              <option value="results_ready">Results Ready</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <BeakerIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Unified Orders</h3>
            <p className="text-gray-600">No unified lab orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
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
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center space-x-2">
                          <QrCodeIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{order.orderNumber}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                        {order.barcode && (
                          <div className="text-xs text-indigo-600 mt-1 font-mono">
                            Barcode: {order.barcode}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.patient.user.firstName} {order.patient.user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{order.patient.user.email}</div>
                        <div className="text-sm text-gray-500">{order.patient.user.phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.orderItems.length} test{order.orderItems.length !== 1 ? 's' : ''}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.orderItems.filter(item => item.status === 'ordered').length} pending
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.paidAmount)} / {formatCurrency(order.totalAmount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Due: {formatCurrency(order.dueAmount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Threshold: {(order.paymentThreshold * 100).toFixed(0)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center space-x-1"
                        >
                          <EyeIcon className="h-4 w-4" />
                          <span>View</span>
                        </button>
                        
                        {canApprove(order) && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailsModal(true);
                            }}
                            className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                            <span>Approve</span>
                          </button>
                        )}
                        
                        {order.dueAmount > 0 && (
                          <button
                            onClick={() => handleCashPayment(order)}
                            className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                          >
                            <BanknotesIcon className="h-4 w-4" />
                            <span>Cash Payment</span>
                          </button>
                        )}
                        
                        {canStartProcessing(order) && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              handleStartProcessing();
                            }}
                            className="text-purple-600 hover:text-purple-900 flex items-center space-x-1"
                          >
                            <PlayIcon className="h-4 w-4" />
                            <span>Start Processing</span>
                          </button>
                        )}
                        
                        {canUploadResults(order) && order.status === 'processing' && (
                          <button
                            onClick={() => handleUploadResults(order)}
                            className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                          >
                            <ArrowUpTrayIcon className="h-4 w-4" />
                            <span>Upload Results</span>
                          </button>
                        )}
                        
                        {order.status === 'results_ready' && (
                          <>
                            <button
                              onClick={() => handleConfirmReports(order)}
                              className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                              <span>Confirm</span>
                            </button>
                            <button
                              onClick={() => handleRevertReports(order)}
                              className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                            >
                              <ArrowPathIcon className="h-4 w-4" />
                              <span>Revert</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Order Details - {selectedOrder.orderNumber}
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Order Information</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Order Number:</span> {selectedOrder.orderNumber}</div>
                    <div><span className="font-medium">Barcode:</span> {selectedOrder.barcode}</div>
                    <div><span className="font-medium">Created:</span> {new Date(selectedOrder.createdAt).toLocaleString()}</div>
                    <div><span className="font-medium">Status:</span> 
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(selectedOrder.status)}`}>
                        {formatStatus(selectedOrder.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Payment Information</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Total Amount:</span> {formatCurrency(selectedOrder.totalAmount)}</div>
                    <div><span className="font-medium">Paid Amount:</span> {formatCurrency(selectedOrder.paidAmount)}</div>
                    <div><span className="font-medium">Due Amount:</span> {formatCurrency(selectedOrder.dueAmount)}</div>
                    <div><span className="font-medium">Payment Threshold:</span> {(selectedOrder.paymentThreshold * 100).toFixed(0)}%</div>
                    <div><span className="font-medium">Sample Allowed:</span> 
                      <span className={`ml-2 ${selectedOrder.sampleAllowed ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedOrder.sampleAllowed ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Patient Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div><span className="font-medium">Name:</span> {selectedOrder.patient.user.firstName} {selectedOrder.patient.user.lastName}</div>
                    <div><span className="font-medium">Email:</span> {selectedOrder.patient.user.email}</div>
                  </div>
                  <div>
                    <div><span className="font-medium">Phone:</span> {selectedOrder.patient.user.phone}</div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
                <div className="space-y-3">
                  {selectedOrder.orderItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">{item.testName}</h5>
                          <p className="text-sm text-gray-600">{item.labTest.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {item.labTest.category}
                            </span>
                            <span className="text-sm font-medium text-indigo-600">
                              {formatCurrency(item.unitPrice)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(item.status)}`}>
                            {formatStatus(item.status)}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {item.isSelected ? 'Selected' : 'Not Selected'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  {selectedOrder.orderItems.filter(item => item.status === 'ordered').length} items pending approval
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedOrder(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                  >
                    Close
                  </button>
                  
                  {canApprove(selectedOrder) && (
                    <button
                      onClick={handleApproveOrder}
                      disabled={approveOrderItemsMutation.isPending}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      <span>Approve Order</span>
                    </button>
                  )}
                  
                  {canStartProcessing(selectedOrder) && (
                    <button
                      onClick={handleStartProcessing}
                      disabled={startProcessingMutation.isPending}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <PlayIcon className="h-4 w-4" />
                      <span>Start Processing</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash Payment Modal */}
      {showCashPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Record Cash Payment
              </h3>
              <button
                onClick={() => {
                  setShowCashPaymentModal(false);
                  setSelectedOrder(null);
                  setPaymentAmount('');
                  setPaymentNotes('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Order: {selectedOrder.orderNumber}</h4>
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">Patient:</span> {selectedOrder.patient.user.firstName} {selectedOrder.patient.user.lastName}</div>
                  <div><span className="font-medium">Total Amount:</span> {formatCurrency(selectedOrder.totalAmount)}</div>
                  <div><span className="font-medium">Paid Amount:</span> {formatCurrency(selectedOrder.paidAmount)}</div>
                  <div><span className="font-medium">Due Amount:</span> {formatCurrency(selectedOrder.dueAmount)}</div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount (BDT)
                  </label>
                  <input
                    type="number"
                    id="paymentAmount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={`Max: ${formatCurrency(selectedOrder.dueAmount)}`}
                    min="0.01"
                    max={selectedOrder.dueAmount}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="paymentNotes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="paymentNotes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Add payment notes..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowCashPaymentModal(false);
                    setSelectedOrder(null);
                    setPaymentAmount('');
                    setPaymentNotes('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleRecordCashPayment}
                  disabled={recordCashPaymentMutation.isPending || !paymentAmount}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <BanknotesIcon className="h-4 w-4" />
                  <span>{recordCashPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Results Modal */}
      {showUploadModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Upload Lab Results
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedOrder(null);
                  setUploadFiles(null);
                  setUploadNotes('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Order: {selectedOrder.orderNumber}</h4>
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">Patient:</span> {selectedOrder.patient.user.firstName} {selectedOrder.patient.user.lastName}</div>
                  <div><span className="font-medium">Status:</span> 
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(selectedOrder.status)}`}>
                      {formatStatus(selectedOrder.status)}
                    </span>
                  </div>
                  <div className="text-yellow-600 text-sm">
                    <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                    Full payment required for results upload
                  </div>
                </div>
              </div>

              {/* Upload Form */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="uploadFiles" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Files
                  </label>
                  <input
                    type="file"
                    id="uploadFiles"
                    multiple
                    onChange={(e) => setUploadFiles(e.target.files)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.dcm,.dicom,.nii,.nifti,.mhd,.raw,.img,.hdr,.vti,.vtp,.stl,.obj,.ply,.xyz,.txt,.csv,.xlsx,.xls,.doc,.docx,.rtf,.odt,.ods,.odp"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported: PDF, images, DICOM, documents (Max 50MB per file)
                  </p>
                </div>

                <div>
                  <label htmlFor="uploadNotes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="uploadNotes"
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    placeholder="Add notes about the results..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedOrder(null);
                    setUploadFiles(null);
                    setUploadNotes('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleUploadFiles}
                  disabled={uploadResultsMutation.isPending || !uploadFiles || uploadFiles.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  <span>{uploadResultsMutation.isPending ? 'Uploading...' : 'Upload Results'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUnifiedOrderManagement;
