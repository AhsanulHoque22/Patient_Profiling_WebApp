import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  UserGroupIcon, 
  StarIcon, 
  MapPinIcon, 
  ClockIcon, 
  AcademicCapIcon,
  TrophyIcon,
  CurrencyDollarIcon,
  LanguageIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Doctor {
  id: number;
  bmdcRegistrationNumber: string;
  specialization: string;
  experience: number;
  rating: number;
  bio: string;
  profileImage?: string;
  degrees: string[];
  awards: string[];
  hospital: string;
  location: string;
  chamberTimes: {
    [key: string]: string[];
  };
  consultationFee: number;
  languages: string[];
  services: string[];
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const Doctors: React.FC = () => {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: doctors, isLoading, error } = useQuery<Doctor[]>({
    queryKey: ['doctors'],
    queryFn: async () => {
      const response = await axios.get('/doctors');
      return response.data.data.doctors;
    },
  });

  const handleViewProfile = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Find Doctors</h1>
        <p className="text-gray-600">
          Browse our network of qualified healthcare professionals.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card text-center py-8">
          <p className="text-gray-500">Unable to load doctors. Please try again later.</p>
        </div>
      ) : !doctors || doctors.length === 0 ? (
        <div className="card text-center py-8">
          <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No doctors available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="card hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    {doctor.profileImage ? (
                      <img
                        src={`http://localhost:5000${doctor.profileImage}`}
                        alt={`Dr. ${doctor.user.firstName} ${doctor.user.lastName}`}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
                        <UserGroupIcon className="h-8 w-8 text-primary-600" />
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Dr. {doctor.user.firstName} {doctor.user.lastName}
                    </h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {doctor.specialization?.replace('_', ' ') || 'General Practice'}
                    </p>
                    {doctor.rating > 0 && (
                      <div className="flex items-center mt-1">
                        <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                        <span className="text-sm text-gray-600">{doctor.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {doctor.hospital && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      <span>{doctor.hospital}</span>
                    </div>
                  )}
                  {doctor.experience && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Experience:</span> {doctor.experience} years
                    </p>
                  )}
                  {doctor.consultationFee && (
                    <div className="flex items-center text-sm text-gray-600">
                      <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                      <span>৳{doctor.consultationFee}</span>
                    </div>
                  )}
                </div>

                {doctor.bio && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {doctor.bio}
                  </p>
                )}

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      // Navigate to appointments page with doctor pre-selected
                      window.location.href = '/appointments?doctorId=' + doctor.id;
                    }}
                    className="flex-1 btn-primary text-sm py-2"
                  >
                    Book Appointment
                  </button>
                  <button 
                    onClick={() => handleViewProfile(doctor)}
                    className="btn-outline text-sm py-2"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Doctor Profile Modal */}
      {showModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Doctor Profile</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Image and Basic Info */}
              <div className="lg:col-span-1">
                <div className="text-center">
                  {selectedDoctor.profileImage ? (
                    <img
                      src={`http://localhost:5000${selectedDoctor.profileImage}`}
                      alt={`Dr. ${selectedDoctor.user.firstName} ${selectedDoctor.user.lastName}`}
                      className="h-32 w-32 rounded-full object-cover mx-auto mb-4"
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                      <UserGroupIcon className="h-16 w-16 text-primary-600" />
                    </div>
                  )}
                  <h3 className="text-xl font-semibold text-gray-900">
                    Dr. {selectedDoctor.user.firstName} {selectedDoctor.user.lastName}
                  </h3>
                  <p className="text-primary-600 capitalize">
                    {selectedDoctor.specialization?.replace('_', ' ') || 'General Practice'}
                  </p>
                  {selectedDoctor.rating > 0 && (
                    <div className="flex items-center justify-center mt-2">
                      <StarIcon className="h-5 w-5 text-yellow-400 mr-1" />
                      <span className="text-gray-600">{selectedDoctor.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {/* BMDC Registration Number */}
                  {selectedDoctor.bmdcRegistrationNumber && (
                    <div className="mt-3 p-2 bg-blue-50 rounded">
                      <p className="text-xs text-blue-600 font-medium">BMDC Reg. No.</p>
                      <p className="text-blue-800 font-semibold">{selectedDoctor.bmdcRegistrationNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Information */}
              <div className="lg:col-span-2 space-y-6">
                {/* Hospital & Location */}
                {(selectedDoctor.hospital || selectedDoctor.location) && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <MapPinIcon className="h-5 w-5 mr-2" />
                      Location
                    </h4>
                    {selectedDoctor.hospital && (
                      <p className="text-gray-700 font-medium">{selectedDoctor.hospital}</p>
                    )}
                    {selectedDoctor.location && (
                      <p className="text-gray-600">{selectedDoctor.location}</p>
                    )}
                  </div>
                )}

                {/* Chamber Times */}
                {Object.keys(selectedDoctor.chamberTimes || {}).length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <ClockIcon className="h-5 w-5 mr-2" />
                      Available Times
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedDoctor.chamberTimes).map(([day, times]) => (
                        times.length > 0 && (
                          <div key={day} className="text-sm">
                            <span className="font-medium text-gray-700">{day}:</span>
                            <div className="text-gray-600">
                              {times.join(', ')}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Degrees */}
                {selectedDoctor.degrees && selectedDoctor.degrees.length > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <AcademicCapIcon className="h-5 w-5 mr-2" />
                      Qualifications
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDoctor.degrees.map((degree, index) => (
                        <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                          {degree}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Awards */}
                {selectedDoctor.awards && selectedDoctor.awards.length > 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <TrophyIcon className="h-5 w-5 mr-2" />
                      Awards & Recognitions
                    </h4>
                    <div className="space-y-1">
                      {selectedDoctor.awards.map((award, index) => (
                        <p key={index} className="text-gray-700 text-sm">• {award}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {selectedDoctor.languages && selectedDoctor.languages.length > 0 && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <LanguageIcon className="h-5 w-5 mr-2" />
                      Languages
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDoctor.languages.map((language, index) => (
                        <span key={index} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                          {language}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Services */}
                {selectedDoctor.services && selectedDoctor.services.length > 0 && (
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Medical Services</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDoctor.services.map((service, index) => (
                        <span key={index} className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bio */}
                {selectedDoctor.bio && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">About</h4>
                    <p className="text-gray-700">{selectedDoctor.bio}</p>
                  </div>
                )}

                {/* Consultation Fee */}
                {selectedDoctor.consultationFee && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                      Consultation Fee
                    </h4>
                    <p className="text-2xl font-bold text-green-600">৳{selectedDoctor.consultationFee}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="btn-outline"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  setShowModal(false);
                  // Navigate to appointments page with doctor pre-selected
                  window.location.href = '/appointments?doctorId=' + selectedDoctor.id;
                }}
                className="btn-primary"
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doctors;
