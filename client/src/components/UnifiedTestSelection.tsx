import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  BeakerIcon,
  ShoppingCartIcon,
  QrCodeIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon
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

interface SelectedTest extends PrescriptionTest {
  quantity: number;
}

// Doctor interface removed as it's not used anymore

interface PrescriptionTest extends LabTest {
  prescriptionId: number;
  appointmentId: number;
  doctorId: number;
  doctorName: string;
  doctorDepartment: string;
  appointmentDate: string;
  prescriptionDate: string;
  originalTest: any;
  // Status information
  status: string;
  paymentStatus: string;
  paidAmount: number;
  dueAmount: number;
  // Lab test ID for unified order creation
  labTestId: number | null;
}

const UnifiedTestSelection: React.FC = () => {
  const [selectedTests, setSelectedTests] = useState<Map<number, SelectedTest>>(new Map());
  const [showCart, setShowCart] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  // Doctor and appointment info will come from prescription data - updated
  const queryClient = useQueryClient();

  // Fetch prescription lab tests
  const { data: prescriptionTests, isLoading } = useQuery<{ tests: PrescriptionTest[] }>({
    queryKey: ['prescriptionLabTests'],
    queryFn: async () => {
      const response = await axios.get('/lab-tests/prescription-tests-unified');
      return response.data.data; // This should be { tests: [...] }
    }
  });

  // No need to fetch doctors separately - info comes from prescriptions

  // Create unified lab test order mutation
  const createUnifiedOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await axios.post('/lab-tests/unified-order', orderData);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Unified lab test order created successfully!');
      setSelectedTests(new Map());
      setOrderNotes('');
      setShowCart(false);
      queryClient.invalidateQueries({ queryKey: ['labTestOrders'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create unified order');
    }
  });

  const toggleTestSelection = (test: PrescriptionTest) => {
    const newSelectedTests = new Map(selectedTests);
    
    if (newSelectedTests.has(test.id)) {
      newSelectedTests.delete(test.id);
    } else {
      newSelectedTests.set(test.id, { ...test, quantity: 1 });
    }
    
    setSelectedTests(newSelectedTests);
  };

  const updateQuantity = (testId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const newSelectedTests = new Map(selectedTests);
    const test = newSelectedTests.get(testId);
    if (test) {
      newSelectedTests.set(testId, { ...test, quantity: newQuantity });
      setSelectedTests(newSelectedTests);
    }
  };

  const removeTest = (testId: number) => {
    const newSelectedTests = new Map(selectedTests);
    newSelectedTests.delete(testId);
    setSelectedTests(newSelectedTests);
  };

  const calculateTotal = () => {
    let total = 0;
    selectedTests.forEach(test => {
      total += test.price * test.quantity;
    });
    return total;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT'
    }).format(amount);
  };

  const handleCreateOrder = () => {
    if (selectedTests.size === 0) {
      toast.error('Please select at least one test');
      return;
    }

    // Extract actual lab test IDs from selected prescription tests
    const selectedTestValues = Array.from(selectedTests.values());
    const testIds = selectedTestValues
      .map(test => test.labTestId)
      .filter(id => id !== null && id !== undefined);

    if (testIds.length === 0) {
      toast.error('Selected tests do not have valid lab test IDs');
      return;
    }

    if (testIds.length !== selectedTestValues.length) {
      toast.error('Some selected tests could not be matched to lab tests');
      return;
    }
    
    createUnifiedOrderMutation.mutate({
      testIds,
      notes: orderNotes
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const tests = prescriptionTests?.tests || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BeakerIcon className="h-8 w-8 text-indigo-500 mr-3" />
              Select Lab Tests
            </h2>
            <p className="text-gray-600 mt-1">
              Choose the tests you need and create a unified order
            </p>
          </div>
          <button
            onClick={() => setShowCart(!showCart)}
            className="relative bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
          >
            <ShoppingCartIcon className="h-5 w-5" />
            <span>Cart ({selectedTests.size})</span>
            {selectedTests.size > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {selectedTests.size}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Prescription Information */}
      {tests.length > 0 && (
        <div className="bg-blue-50 rounded-xl shadow-sm p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">📋 Eligible Prescription Lab Tests</h3>
          <p className="text-blue-800 mb-4">
            These are lab tests prescribed by your doctors that are eligible for unified payment. Only tests that are <strong>pending approval</strong> or <strong>approved</strong> with <strong>unpaid</strong> or <strong>partial payment</strong> status are shown.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(new Set(tests.map(test => test.doctorName))).map(doctorName => {
              const doctorTests = tests.filter(test => test.doctorName === doctorName);
              const firstTest = doctorTests[0];
              return (
                <div key={doctorName} className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Dr. {doctorName}</h4>
                  <p className="text-sm text-gray-600 mb-1">{firstTest.doctorDepartment}</p>
                  <p className="text-sm text-gray-500">
                    {doctorTests.length} test{doctorTests.length > 1 ? 's' : ''} prescribed
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Prescribed: {new Date(firstTest.prescriptionDate).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tests List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Available Tests</h3>
              <p className="text-sm text-gray-600">Select tests to add to your order</p>
            </div>
            
            <div className="p-6">
              {tests.length === 0 ? (
                <div className="text-center py-12">
                  <BeakerIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Eligible Tests Available</h3>
                  <p className="text-gray-600">
                    No prescription lab tests are currently eligible for unified payment.
                    <br />
                    Tests must be in "ordered" or "approved" status with "unpaid" or "partial payment" status.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tests.map((test) => {
                    const isSelected = selectedTests.has(test.id);
                    const selectedTest = selectedTests.get(test.id);
                    
                    return (
                      <div
                        key={test.id}
                        className={`border rounded-lg p-4 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                        onClick={() => toggleTestSelection(test)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleTestSelection(test)}
                                className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <h4 className="font-semibold text-gray-900">{test.name}</h4>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                            
                            {/* Prescription Information */}
                            <div className="bg-blue-50 rounded-lg p-2 mb-2">
                              <div className="flex items-center justify-between text-xs">
                                <div>
                                  <p className="font-medium text-blue-900">Dr. {test.doctorName}</p>
                                  <p className="text-blue-700">{test.doctorDepartment}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-blue-600">Appt #{test.appointmentId}</p>
                                  <p className="text-blue-500">
                                    {new Date(test.prescriptionDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Status and Payment Information */}
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200">
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    test.status === 'ordered' 
                                      ? 'bg-yellow-100 text-yellow-800' 
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    {test.status === 'ordered' ? 'Pending Approval' : 'Approved'}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    test.paymentStatus === 'not_paid'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {test.paymentStatus === 'not_paid' ? 'Unpaid' : 'Partial Payment'}
                                  </span>
                                </div>
                                {test.dueAmount > 0 && (
                                  <span className="text-xs text-gray-600">
                                    Due: {formatCurrency(test.dueAmount)}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {test.category}
                              </span>
                              <span className="font-semibold text-indigo-600">
                                {formatCurrency(test.price)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {isSelected && selectedTest && (
                          <div className="mt-3 pt-3 border-t border-indigo-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Quantity:</span>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(test.id, selectedTest.quantity - 1);
                                  }}
                                  className="h-6 w-6 rounded-full bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center"
                                >
                                  <MinusIcon className="h-3 w-3 text-indigo-600" />
                                </button>
                                <span className="text-sm font-medium w-8 text-center">
                                  {selectedTest.quantity}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(test.id, selectedTest.quantity + 1);
                                  }}
                                  className="h-6 w-6 rounded-full bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center"
                                >
                                  <PlusIcon className="h-3 w-3 text-indigo-600" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-2 text-right">
                              <span className="text-sm font-semibold text-indigo-600">
                                Subtotal: {formatCurrency(test.price * selectedTest.quantity)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cart Sidebar */}
        {showCart && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-6">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
                  <button
                    onClick={() => setShowCart(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {selectedTests.size === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCartIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">Your cart is empty</p>
                    <p className="text-sm text-gray-500">Select tests to add them to your order</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Prescription Information Summary */}
                    {Array.from(selectedTests.values()).length > 0 && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">Prescription Tests Selected</h4>
                        <div className="space-y-1">
                          {Array.from(new Set(Array.from(selectedTests.values()).map(test => test.doctorName))).map(doctorName => {
                            const doctorTests = Array.from(selectedTests.values()).filter(test => test.doctorName === doctorName);
                            return (
                              <p key={doctorName} className="text-sm text-blue-800">
                                Dr. {doctorName}: {doctorTests.length} test{doctorTests.length > 1 ? 's' : ''}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Selected Tests */}
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {Array.from(selectedTests.values()).map((test) => (
                        <div key={test.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 text-sm">{test.name}</h5>
                            <p className="text-xs text-gray-600">Qty: {test.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(test.price * test.quantity)}
                            </p>
                            <button
                              onClick={() => removeTest(test.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-gray-900">Total:</span>
                        <span className="text-lg font-bold text-indigo-600">
                          {formatCurrency(calculateTotal())}
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Order Notes (Optional)
                      </label>
                      <textarea
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        rows={3}
                        placeholder="Add any special instructions or notes..."
                      />
                    </div>

                    {/* Create Order Button */}
                    <button
                      onClick={handleCreateOrder}
                      disabled={createUnifiedOrderMutation.isPending}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {createUnifiedOrderMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Creating Order...</span>
                        </>
                      ) : (
                        <>
                          <QrCodeIcon className="h-5 w-5" />
                          <span>Create Unified Order</span>
                        </>
                      )}
                    </button>

                    <p className="text-xs text-gray-500 text-center">
                      A unique order ID and barcode will be generated for tracking
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedTestSelection;
