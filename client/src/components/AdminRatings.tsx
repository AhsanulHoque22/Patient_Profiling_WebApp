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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-indigo-50/80 to-cyan-50/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-br from-indigo-400/20 to-cyan-400/20 backdrop-blur-sm">
              <StarIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-indigo-700">Average Rating</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">{stats.averageRating || '0.0'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-50/80 to-green-50/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-br from-emerald-400/20 to-green-400/20 backdrop-blur-sm">
              <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-emerald-700">Approved</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">{stats.approvedRatings || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-400/20 backdrop-blur-sm">
              <ClockIcon className="h-6 w-6 text-amber-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-amber-700">Pending</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{stats.pendingRatings || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-rose-50/80 to-red-50/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-br from-rose-400/20 to-red-400/20 backdrop-blur-sm">
              <XCircleIcon className="h-6 w-6 text-rose-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-rose-700">Rejected</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-transparent">{stats.rejectedRatings || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-100 to-purple-100 px-6 py-4">
          <div className="flex items-center">
            <StarIcon className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Filters & Search</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-indigo-700">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all duration-300 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-indigo-700">Rating:</label>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all duration-300 text-sm"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>

            <div className="text-sm text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2 rounded-lg">
              Showing <span className="font-semibold text-indigo-800">{ratings.length}</span> of <span className="font-semibold text-indigo-800">{pagination?.totalRatings || 0}</span> ratings
            </div>
          </div>
        </div>
      </div>

      {/* Ratings List */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="space-y-4">
            {ratings.length === 0 ? (
              <div className="text-center py-12">
                <StarIcon className="h-16 w-16 text-indigo-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">No Ratings Found</h3>
                <p className="text-gray-500">No ratings match your current filters</p>
              </div>
            ) : (
              ratings.map((rating: Rating) => (
                <div key={rating.id} className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 backdrop-blur-sm rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:scale-[1.01]">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-semibold text-gray-900 text-lg">
                              {rating.isAnonymous ? 'Anonymous Patient' : 
                               `${rating.patient.user.firstName} ${rating.patient.user.lastName}`}
                            </p>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${getStatusColor(rating.status)}`}>
                              {getStatusIcon(rating.status)}
                              <span className="ml-1 capitalize">{rating.status}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            {renderStars(rating.rating)}
                            <span className="text-gray-400">•</span>
                            <span className="font-medium">Dr. {rating.appointment.doctor.user.firstName} {rating.appointment.doctor.user.lastName}</span>
                            <span className="text-gray-400">•</span>
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              {new Date(rating.appointment.appointmentDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {rating.review && (
                        <div className="mb-4 p-4 bg-white/60 backdrop-blur-sm rounded-lg">
                          <p className="text-gray-700 leading-relaxed">{rating.review}</p>
                        </div>
                      )}

                      {rating.feedback && (
                        <div className="bg-gradient-to-r from-indigo-100/80 to-purple-100/80 backdrop-blur-sm rounded-lg p-4 mb-4">
                          <p className="text-sm text-indigo-800">
                            <span className="font-semibold">Admin Feedback:</span> {rating.feedback}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 ml-6">
                      <button
                        onClick={() => {
                          setSelectedRating(rating);
                          setShowDetailModal(true);
                        }}
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-900 text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-all duration-300 backdrop-blur-sm"
                      >
                        <EyeIcon className="h-4 w-4" />
                        View Details
                      </button>

                      {rating.status === 'pending' && (
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => handleStatusUpdate(rating.id, 'approved')}
                            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-900 text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 transition-all duration-300 backdrop-blur-sm"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(rating.id, 'rejected')}
                            className="flex items-center gap-2 text-rose-600 hover:text-rose-900 text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-rose-50 to-red-50 hover:from-rose-100 hover:to-red-100 transition-all duration-300 backdrop-blur-sm"
                          >
                            <XCircleIcon className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-100 to-purple-100 px-6 py-4">
            <div className="flex justify-center items-center gap-4">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!pagination.hasPrev}
                className="px-4 py-2 text-sm text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg hover:from-indigo-100 hover:to-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 backdrop-blur-sm"
              >
                Previous
              </button>
              <div className="flex items-center gap-2">
                <span className="px-4 py-2 text-sm text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                  Page <span className="font-semibold text-indigo-800">{pagination.currentPage}</span> of <span className="font-semibold text-indigo-800">{pagination.totalPages}</span>
                </span>
              </div>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!pagination.hasNext}
                className="px-4 py-2 text-sm text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg hover:from-indigo-100 hover:to-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 backdrop-blur-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                    <StarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Rating Details</h2>
                    <p className="text-indigo-100 text-sm">Complete rating information and management</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
                    <label className="text-sm font-medium text-indigo-700 block mb-2">Patient</label>
                    <p className="text-gray-900 font-medium">
                      {selectedRating.isAnonymous ? 'Anonymous Patient' : 
                       `${selectedRating.patient.user.firstName} ${selectedRating.patient.user.lastName}`}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
                    <label className="text-sm font-medium text-indigo-700 block mb-2">Doctor</label>
                    <p className="text-gray-900 font-medium">
                      Dr. {selectedRating.appointment.doctor.user.firstName} {selectedRating.appointment.doctor.user.lastName}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
                    <label className="text-sm font-medium text-indigo-700 block mb-2">Appointment Date</label>
                    <p className="text-gray-900 font-medium">
                      {new Date(selectedRating.appointment.appointmentDate).toLocaleDateString()} at {selectedRating.appointment.appointmentTime}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
                    <label className="text-sm font-medium text-indigo-700 block mb-2">Rating</label>
                    <div className="flex items-center gap-2">
                      {renderStars(selectedRating.rating)}
                      <span className="text-gray-900 font-medium">({selectedRating.rating}/5)</span>
                    </div>
                  </div>
                </div>

                {selectedRating.review && (
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
                    <label className="text-sm font-medium text-indigo-700 block mb-3">Patient Review</label>
                    <p className="text-gray-900 leading-relaxed">{selectedRating.review}</p>
                  </div>
                )}

                {selectedRating.feedback && (
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6">
                    <label className="text-sm font-medium text-emerald-700 block mb-3">Admin Feedback</label>
                    <p className="text-gray-900 leading-relaxed">{selectedRating.feedback}</p>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                  {selectedRating.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          handleStatusUpdate(selectedRating.id, 'approved');
                          setShowDetailModal(false);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          handleStatusUpdate(selectedRating.id, 'rejected');
                          setShowDetailModal(false);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-lg hover:from-rose-700 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                      >
                        <XCircleIcon className="h-4 w-4" />
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
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
