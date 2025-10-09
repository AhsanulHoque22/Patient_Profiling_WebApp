import React from 'react';
import AdminRatings from '../components/AdminRatings';
import { StarIcon } from '@heroicons/react/24/outline';

const AdminRatingsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 flex items-center">
                <StarIcon className="h-8 w-8 text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text mr-3" />
                Doctor Ratings Management
              </h1>
              <p className="text-gray-600">Manage and moderate doctor ratings and reviews with transparency and care</p>
            </div>
          </div>
        </div>

        <AdminRatings />
      </div>
    </div>
  );
};

export default AdminRatingsPage;
