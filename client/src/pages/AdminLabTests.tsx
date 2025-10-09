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
  DocumentTextIcon,
  HeartIcon,
  ArrowPathIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  ChartBarIcon,
  TagIcon
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading lab tests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 flex items-center">
              <HeartIcon className="h-8 w-8 text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text mr-3" />
              Lab Test Management
            </h1>
            <p className="text-gray-600">Comprehensive laboratory test administration and management system</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['admin-lab-tests'] });
                toast.success('Data refreshed successfully');
              }}
              className="flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-purple-200 rounded-lg hover:bg-purple-50/80 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Refresh</span>
            </button>
            <button
              onClick={() => {
                setEditingTest({});
                setShowCreateModal(true);
              }}
              className="flex items-center px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Add New Test</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50/80 to-cyan-50/80 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-blue-100/50 hover:border-blue-200/70">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-400/20 backdrop-blur-sm border border-blue-300/30">
              <BeakerIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-700">Total Tests</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {testsData?.pagination?.total || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50/80 to-green-50/80 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-emerald-100/50 hover:border-emerald-200/70">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-br from-emerald-400/20 to-green-400/20 backdrop-blur-sm border border-emerald-300/30">
              <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-emerald-700">Active Tests</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                {testsData?.tests?.filter((test: LabTest) => test.isActive).length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50/80 to-red-50/80 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-rose-100/50 hover:border-rose-200/70">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-br from-rose-400/20 to-red-400/20 backdrop-blur-sm border border-rose-300/30">
              <XCircleIcon className="h-6 w-6 text-rose-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-rose-700">Inactive Tests</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-transparent">
                {testsData?.tests?.filter((test: LabTest) => !test.isActive).length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-50/80 to-purple-50/80 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-violet-100/50 hover:border-violet-200/70">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-br from-violet-400/20 to-purple-400/20 backdrop-blur-sm border border-violet-300/30">
              <ChartBarIcon className="h-6 w-6 text-violet-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-violet-700">Categories</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                {testsData?.categories?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/90 rounded-xl shadow-xl overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-indigo-100 to-purple-100 px-6 py-4">
          <div className="flex items-center">
            <FunnelIcon className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Filters & Search</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-indigo-700 mb-2">
                Search Tests
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or description"
                  className="w-full pl-10 pr-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-indigo-700 mb-2">
                Category Filter
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
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
              <label className="block text-sm font-medium text-indigo-700 mb-2">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
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
                className="w-full px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-lg hover:from-indigo-200 hover:to-purple-200 transition-all duration-300"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tests List */}
      {!testsData?.tests || testsData.tests.length === 0 ? (
        <div className="bg-white/90 rounded-xl shadow-xl">
          <div className="p-12 text-center">
            <BeakerIcon className="h-16 w-16 text-indigo-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">No Lab Tests Found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || categoryFilter ? 'No tests found with the selected filters.' : 'No lab tests have been added yet.'}
            </p>
            {!searchTerm && !categoryFilter && (
              <button
                onClick={() => {
                  setEditingTest({});
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Your First Test
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white/90 rounded-xl shadow-xl overflow-hidden">
          <div className="p-6">
            <div className="space-y-6">
              {Object.entries(testsData.groupedTests || {}).map(([category, tests], categoryIndex) => {
                return (
                  <div key={category} className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl overflow-hidden shadow-lg">
                    <div className="px-6 py-4 bg-white/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-indigo-900 flex items-center">
                            <TagIcon className="h-5 w-5 mr-2 text-indigo-700" />
                            {category}
                          </h3>
                          <p className="text-sm text-gray-600">{(tests as LabTest[]).length} test(s) available</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {(tests as LabTest[]).map((test: LabTest, testIndex) => {
                          return (
                            <div key={test.id} className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] shadow-lg">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-semibold text-gray-900 text-lg">{test.name}</h4>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                                      test.isActive 
                                        ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-200/50' 
                                        : 'bg-rose-100/80 text-rose-800 border border-rose-200/50'
                                    }`}>
                                      {test.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-4">{test.description}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleEditTest(test)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50/80 rounded-lg transition-all duration-300 backdrop-blur-sm"
                                    title="Edit Test"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTest(test)}
                                    className="p-2 text-rose-600 hover:bg-rose-50/80 rounded-lg transition-all duration-300 backdrop-blur-sm"
                                    title={test.isActive ? 'Deactivate Test' : 'Delete Test'}
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg p-3 shadow-sm">
                                  <div className="flex items-center mb-1">
                                    <CurrencyDollarIcon className="h-4 w-4 text-indigo-600 mr-2" />
                                    <span className="text-xs font-medium text-indigo-700">Price</span>
                                  </div>
                                  <p className="text-lg font-bold text-indigo-700">{formatCurrency(test.price)}</p>
                                </div>
                                
                                <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg p-3 shadow-sm">
                                  <div className="flex items-center mb-1">
                                    <ClockIcon className="h-4 w-4 text-indigo-600 mr-2" />
                                    <span className="text-xs font-medium text-indigo-700">Delivery Time</span>
                                  </div>
                                  <p className="text-lg font-bold text-indigo-700">{test.reportDeliveryTime}h</p>
                                </div>
                              </div>
                              
                              <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg p-3 shadow-sm">
                                <div className="flex items-center mb-1">
                                  <DocumentTextIcon className="h-4 w-4 text-indigo-600 mr-2" />
                                  <span className="text-xs font-medium text-indigo-700">Sample Type</span>
                                </div>
                                <p className="text-sm font-medium text-indigo-700">{test.sampleType || 'N/A'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {testsData.pagination && testsData.pagination.totalPages > 1 && (
            <div className="bg-gradient-to-r from-indigo-100 to-purple-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-indigo-700">
                  <span>Showing page <span className="font-semibold text-indigo-900">{testsData.pagination.currentPage}</span> of{' '}
                  <span className="font-semibold text-indigo-900">{testsData.pagination.totalPages}</span></span>
                  <span className="mx-2 text-indigo-400">•</span>
                  <span className="text-indigo-600">{testsData.pagination.total} total tests</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={!testsData.pagination.hasPrev}
                    className="px-3 py-2 text-sm font-medium text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg hover:from-indigo-100 hover:to-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, testsData.pagination.totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(testsData.pagination.totalPages - 4, page - 2)) + i;
                      if (pageNum > testsData.pagination.totalPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                            pageNum === page
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                              : 'text-indigo-700 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!testsData.pagination.hasNext}
                    className="px-3 py-2 text-sm font-medium text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg hover:from-indigo-100 hover:to-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                    <BeakerIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Create New Lab Test</h2>
                    <p className="text-indigo-100 text-sm">Add a new laboratory test to the system</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                      Basic Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Test Name *
                        </label>
                        <input
                          type="text"
                          value={editingTest.name || ''}
                          onChange={(e) => setEditingTest({ ...editingTest, name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          rows={3}
                          placeholder="Enter test description"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-600" />
                      Pricing & Category
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category *
                        </label>
                        <select
                          value={editingTest.category || ''}
                          onChange={(e) => setEditingTest({ ...editingTest, category: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-purple-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <ClockIcon className="h-5 w-5 mr-2 text-purple-600" />
                      Test Details
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sample Type
                        </label>
                        <input
                          type="text"
                          value={editingTest.sampleType || ''}
                          onChange={(e) => setEditingTest({ ...editingTest, sampleType: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="24"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <DocumentTextIcon className="h-5 w-5 mr-2 text-yellow-600" />
                      Preparation Instructions
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instructions
                      </label>
                      <textarea
                        value={editingTest.preparationInstructions || ''}
                        onChange={(e) => setEditingTest({ ...editingTest, preparationInstructions: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        rows={4}
                        placeholder="Enter preparation instructions for patients"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTest}
                  disabled={createTestMutation.isPending}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
                >
                  {createTestMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Test'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Test Modal */}
      {showEditModal && selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                    <PencilIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Edit Lab Test</h2>
                    <p className="text-emerald-100 text-sm">Update laboratory test information</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                      Basic Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Test Name *
                        </label>
                        <input
                          type="text"
                          value={editingTest.name || ''}
                          onChange={(e) => setEditingTest({ ...editingTest, name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-600" />
                      Pricing & Category
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category *
                        </label>
                        <select
                          value={editingTest.category || ''}
                          onChange={(e) => setEditingTest({ ...editingTest, category: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-purple-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <ClockIcon className="h-5 w-5 mr-2 text-purple-600" />
                      Test Details
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sample Type
                        </label>
                        <input
                          type="text"
                          value={editingTest.sampleType || ''}
                          onChange={(e) => setEditingTest({ ...editingTest, sampleType: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <DocumentTextIcon className="h-5 w-5 mr-2 text-yellow-600" />
                      Preparation Instructions
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instructions
                      </label>
                      <textarea
                        value={editingTest.preparationInstructions || ''}
                        onChange={(e) => setEditingTest({ ...editingTest, preparationInstructions: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        rows={4}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 mr-2 text-gray-600" />
                      Status
                    </h3>
                    <div>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={editingTest.isActive || false}
                          onChange={(e) => setEditingTest({ ...editingTest, isActive: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Test is active and available for ordering</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTest}
                  disabled={updateTestMutation.isPending}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
                >
                  {updateTestMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Test'
                  )}
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
