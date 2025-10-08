import React from 'react';
import AdminRatings from '../components/AdminRatings';

const AdminRatingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Doctor Ratings Management</h1>
        <p className="text-gray-600">Manage and moderate doctor ratings and reviews.</p>
      </div>

      <AdminRatings />
    </div>
  );
};

export default AdminRatingsPage;
