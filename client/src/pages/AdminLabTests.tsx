import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatCurrency } from '../services/paymentService';
import { 
  BeakerIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DocumentTextIcon
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const AdminLabTests: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [editingTest, setEditingTest] = useState<Partial<LabTest>>({});
  
  const queryClient = useQueryClient();

  // Fetch lab tests
  const { data: testsData, isLoading: testsLoading } = useQuery({
    queryKey: ['admin-lab-tests', searchTerm, categoryFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(statusFilter && { isActive: statusFilter }),
      });
      const response = await axios.get(`/admin/lab-tests?${params}`);
      return response.data.data;
    },
  });

  // Create lab test mutation
  const createTestMutation = useMutation({
    mutationFn: async (testData: Partial<LabTest>) => {
      const response = await axios.post('/admin/lab-tests', testData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lab-tests'] });
      toast.success('Lab test created successfully');
      setShowCreateModal(false);
      setEditingTest({});
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create lab test');
    },
  });

  // Update lab test mutation
  const updateTestMutation = useMutation({
    mutationFn: async ({ testId, testData }: { testId: number; testData: Partial<LabTest> }) => {
      const response = await axios.put(`/admin/lab-tests/${testId}`, testData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lab-tests'] });
      toast.success('Lab test updated successfully');
      setShowEditModal(false);
      setEditingTest({});
      setSelectedTest(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update lab test');
    },
  });

  // Delete lab test mutation
  const deleteTestMutation = useMutation({
    mutationFn: async (testId: number) => {
      const response = await axios.delete(`/admin/lab-tests/${testId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lab-tests'] });
      toast.success('Lab test deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete lab test');
    },
  });

  const handleCreateTest = () => {
    if (!editingTest.name || !editingTest.category || !editingTest.price) {
      toast.error('Please fill in all required fields');
      return;
    }
    createTestMutation.mutate(editingTest);
  };

  const handleUpdateTest = () => {
    if (!selectedTest || !editingTest.name || !editingTest.category || !editingTest.price) {
      toast.error('Please fill in all required fields');
      return;
    }
    updateTestMutation.mutate({ testId: selectedTest.id, testData: editingTest });
  };

  const handleEditTest = (test: LabTest) => {
    setSelectedTest(test);
    setEditingTest({
      name: test.name,
      description: test.description,
      category: test.category,
      price: test.price,
      sampleType: test.sampleType,
      preparationInstructions: test.preparationInstructions,
      reportDeliveryTime: test.reportDeliveryTime,
      isActive: test.isActive
    });
    setShowEditModal(true);
  };

  const handleDeleteTest = (test: LabTest) => {
    if (window.confirm(`Are you sure you want to ${test.isActive ? 'deactivate' : 'delete'} "${test.name}"?`)) {
      deleteTestMutation.mutate(test.id);
    }
  };

  if (testsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-header">Lab Test Management</h1>
          <p className="text-gray-600">
            Manage lab tests, prices, and availability
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTest({});
            setShowCreateModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add New Test
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Tests
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or description"
                  className="input-field pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Filter
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input-field"
              >
                <option value="">All Categories</option>
                {testsData?.categories?.map((category: string) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('');
                  setStatusFilter('');
                  setPage(1);
                }}
                className="btn-outline w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tests List */}
      {!testsData?.tests || testsData.tests.length === 0 ? (
        <div className="card">
          <div className="p-8 text-center">
            <BeakerIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Lab Tests Found</h3>
            <p className="text-gray-600">
              {searchTerm || categoryFilter ? 'No tests found with the selected filters.' : 'No lab tests have been added yet.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {Object.entries(testsData.groupedTests || {}).map(([category, tests]) => (
              <div key={category} className="card">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                  <p className="text-sm text-gray-600">{(tests as LabTest[]).length} test(s)</p>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {(tests as LabTest[]).map((test: LabTest) => (
                      <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900">{test.name}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              test.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {test.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <CurrencyDollarIcon className="h-4 w-4" />
                              {formatCurrency(test.price)}
                            </span>
                            <span className="flex items-center gap-1">
                              <DocumentTextIcon className="h-4 w-4" />
                              {test.sampleType}
                            </span>
                            <span className="flex items-center gap-1">
                              <ClockIcon className="h-4 w-4" />
                              {test.reportDeliveryTime}h
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditTest(test)}
                            className="btn-outline flex items-center gap-2"
                          >
                            <PencilIcon className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTest(test)}
                            className="btn-danger flex items-center gap-2"
                          >
                            <TrashIcon className="h-4 w-4" />
                            {test.isActive ? 'Deactivate' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {testsData.pagination && testsData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!testsData.pagination.hasPrev}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!testsData.pagination.hasNext}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{testsData.pagination.currentPage}</span> of{' '}
                    <span className="font-medium">{testsData.pagination.totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={!testsData.pagination.hasPrev}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={!testsData.pagination.hasNext}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create New Lab Test</h2>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Name *
                  </label>
                  <input
                    type="text"
                    value={editingTest.name || ''}
                    onChange={(e) => setEditingTest({ ...editingTest, name: e.target.value })}
                    className="input-field"
                    placeholder="Enter test name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editingTest.description || ''}
                    onChange={(e) => setEditingTest({ ...editingTest, description: e.target.value })}
                    className="input-field"
                    rows={3}
                    placeholder="Enter test description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={editingTest.category || ''}
                      onChange={(e) => setEditingTest({ ...editingTest, category: e.target.value })}
                      className="input-field"
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="Blood Tests">Blood Tests</option>
                      <option value="Imaging Tests">Imaging Tests</option>
                      <option value="Urine Tests">Urine Tests</option>
                      <option value="Cardiac Tests">Cardiac Tests</option>
                      <option value="Hormone Tests">Hormone Tests</option>
                      <option value="Cancer Screening">Cancer Screening</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (৳) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingTest.price || ''}
                      onChange={(e) => setEditingTest({ ...editingTest, price: parseFloat(e.target.value) })}
                      className="input-field"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sample Type
                    </label>
                    <input
                      type="text"
                      value={editingTest.sampleType || ''}
                      onChange={(e) => setEditingTest({ ...editingTest, sampleType: e.target.value })}
                      className="input-field"
                      placeholder="e.g., Blood, Urine, N/A"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Report Delivery Time (hours)
                    </label>
                    <input
                      type="number"
                      value={editingTest.reportDeliveryTime || ''}
                      onChange={(e) => setEditingTest({ ...editingTest, reportDeliveryTime: parseInt(e.target.value) })}
                      className="input-field"
                      placeholder="24"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preparation Instructions
                  </label>
                  <textarea
                    value={editingTest.preparationInstructions || ''}
                    onChange={(e) => setEditingTest({ ...editingTest, preparationInstructions: e.target.value })}
                    className="input-field"
                    rows={3}
                    placeholder="Enter preparation instructions"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTest}
                  disabled={createTestMutation.isPending}
                  className="flex-1 btn-primary"
                >
                  {createTestMutation.isPending ? 'Creating...' : 'Create Test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Test Modal */}
      {showEditModal && selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Lab Test</h2>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Name *
                  </label>
                  <input
                    type="text"
                    value={editingTest.name || ''}
                    onChange={(e) => setEditingTest({ ...editingTest, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editingTest.description || ''}
                    onChange={(e) => setEditingTest({ ...editingTest, description: e.target.value })}
                    className="input-field"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={editingTest.category || ''}
                      onChange={(e) => setEditingTest({ ...editingTest, category: e.target.value })}
                      className="input-field"
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="Blood Tests">Blood Tests</option>
                      <option value="Imaging Tests">Imaging Tests</option>
                      <option value="Urine Tests">Urine Tests</option>
                      <option value="Cardiac Tests">Cardiac Tests</option>
                      <option value="Hormone Tests">Hormone Tests</option>
                      <option value="Cancer Screening">Cancer Screening</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (৳) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingTest.price || ''}
                      onChange={(e) => setEditingTest({ ...editingTest, price: parseFloat(e.target.value) })}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sample Type
                    </label>
                    <input
                      type="text"
                      value={editingTest.sampleType || ''}
                      onChange={(e) => setEditingTest({ ...editingTest, sampleType: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Report Delivery Time (hours)
                    </label>
                    <input
                      type="number"
                      value={editingTest.reportDeliveryTime || ''}
                      onChange={(e) => setEditingTest({ ...editingTest, reportDeliveryTime: parseInt(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preparation Instructions
                  </label>
                  <textarea
                    value={editingTest.preparationInstructions || ''}
                    onChange={(e) => setEditingTest({ ...editingTest, preparationInstructions: e.target.value })}
                    className="input-field"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingTest.isActive || false}
                      onChange={(e) => setEditingTest({ ...editingTest, isActive: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTest}
                  disabled={updateTestMutation.isPending}
                  className="flex-1 btn-primary"
                >
                  {updateTestMutation.isPending ? 'Updating...' : 'Update Test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLabTests;
