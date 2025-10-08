import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  StarIcon, 
  UserIcon, 
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface Rating {
  id: number;
  rating: number;
  review: string | null;
  feedback: string | null;
  isAnonymous: boolean;
  status: string;
  createdAt: string;
  appointment: {
    id: number;
    appointmentDate: string;
    appointmentTime: string;
    type: string;
    doctor: {
      user: {
        firstName: string;
        lastName: string;
      };
      department: string;
    };
  };
  patient: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

interface RatingStats {
  averageRating: string;
  totalRatings: number;
  pendingRatings: number;
  approvedRatings: number;
  rejectedRatings: number;
}

const AdminRatings: React.FC = () => {
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const queryClient = useQueryClient();

  const { data: ratingsData, isLoading } = useQuery({
    queryKey: ['admin-ratings', statusFilter, ratingFilter, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (ratingFilter !== 'all') params.append('rating', ratingFilter);
      params.append('page', currentPage.toString());
      
      const response = await axios.get(`/ratings/admin/all?${params}`);
      return response.data.data;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['rating-stats'],
    queryFn: async () => {
      const response = await axios.get('/ratings/admin/stats');
      return response.data.data;
    },
  });

  const ratings = ratingsData?.ratings || [];
  const pagination = ratingsData?.pagination;
  const stats = statsData?.overall || {};

  const handleStatusUpdate = async (ratingId: number, status: string) => {
    try {
      await axios.put(`/ratings/admin/${ratingId}/status`, { status });
      toast.success(`Rating ${status} successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin-ratings'] });
      queryClient.invalidateQueries({ queryKey: ['rating-stats'] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update rating status');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          star <= rating ? (
            <StarIconSolid key={star} className="h-4 w-4 text-yellow-400" />
          ) : (
            <StarIcon key={star} className="h-4 w-4 text-gray-300" />
          )
        ))}
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircleIcon className="h-4 w-4" />;
      case 'pending': return <ClockIcon className="h-4 w-4" />;
      case 'rejected': return <XCircleIcon className="h-4 w-4" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-4">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <StarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageRating || '0.0'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.approvedRatings || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingRatings || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">{stats.rejectedRatings || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Rating:</label>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>

        <div className="text-sm text-gray-600">
          Showing {ratings.length} of {pagination?.totalRatings || 0} ratings
        </div>
      </div>

      {/* Ratings List */}
      <div className="space-y-4">
        {ratings.length === 0 ? (
          <div className="text-center py-8">
            <StarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No ratings found</p>
          </div>
        ) : (
          ratings.map((rating: Rating) => (
            <div key={rating.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {rating.isAnonymous ? 'Anonymous Patient' : 
                           `${rating.patient.user.firstName} ${rating.patient.user.lastName}`}
                        </p>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(rating.status)}`}>
                          {getStatusIcon(rating.status)}
                          <span className="ml-1">{rating.status}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {renderStars(rating.rating)}
                        <span className="text-gray-500">•</span>
                        <span>Dr. {rating.appointment.doctor.user.firstName} {rating.appointment.doctor.user.lastName}</span>
                        <span className="text-gray-500">•</span>
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {new Date(rating.appointment.appointmentDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {rating.review && (
                    <div className="mb-3">
                      <p className="text-gray-700">{rating.review}</p>
                    </div>
                  )}

                  {rating.feedback && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">Feedback:</span> {rating.feedback}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => {
                      setSelectedRating(rating);
                      setShowDetailModal(true);
                    }}
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-900 text-sm px-3 py-1 rounded hover:bg-primary-50 transition-colors"
                  >
                    <EyeIcon className="h-4 w-4" />
                    View
                  </button>

                  {rating.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(rating.id, 'approved')}
                        className="flex items-center gap-1 text-green-600 hover:text-green-900 text-sm px-3 py-1 rounded hover:bg-green-50 transition-colors"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(rating.id, 'rejected')}
                        className="flex items-center gap-1 text-red-600 hover:text-red-900 text-sm px-3 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        <XCircleIcon className="h-4 w-4" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={!pagination.hasPrev}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={!pagination.hasNext}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Rating Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Patient</label>
                    <p className="text-gray-900">
                      {selectedRating.isAnonymous ? 'Anonymous Patient' : 
                       `${selectedRating.patient.user.firstName} ${selectedRating.patient.user.lastName}`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Doctor</label>
                    <p className="text-gray-900">
                      Dr. {selectedRating.appointment.doctor.user.firstName} {selectedRating.appointment.doctor.user.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Appointment Date</label>
                    <p className="text-gray-900">
                      {new Date(selectedRating.appointment.appointmentDate).toLocaleDateString()} at {selectedRating.appointment.appointmentTime}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Rating</label>
                    <div className="flex items-center gap-2">
                      {renderStars(selectedRating.rating)}
                      <span className="text-gray-900">({selectedRating.rating}/5)</span>
                    </div>
                  </div>
                </div>

                {selectedRating.review && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Review</label>
                    <p className="text-gray-900 mt-1">{selectedRating.review}</p>
                  </div>
                )}

                {selectedRating.feedback && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Feedback</label>
                    <p className="text-gray-900 mt-1">{selectedRating.feedback}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  {selectedRating.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          handleStatusUpdate(selectedRating.id, 'approved');
                          setShowDetailModal(false);
                        }}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          handleStatusUpdate(selectedRating.id, 'rejected');
                          setShowDetailModal(false);
                        }}
                        className="btn-outline flex items-center gap-2"
                      >
                        <XCircleIcon className="h-4 w-4" />
                        Reject
                      </button>
                    </>
                  )}
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
        </div>
      )}
    </div>
  );
};

export default AdminRatings;
