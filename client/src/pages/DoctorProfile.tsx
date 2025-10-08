import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../services/paymentService';
import { MEDICAL_DEPARTMENTS, getDepartmentLabel } from '../utils/departments';
import { 
  UserIcon, 
  AcademicCapIcon, 
  TrophyIcon, 
  MapPinIcon, 
  ClockIcon,
  CameraIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface DoctorProfileData {
  profileImage?: string;
  bmdcRegistrationNumber?: string;
  department?: string | null | undefined;
  experience?: number | null | undefined;
  education?: string | null | undefined;
  certifications?: string | null | undefined;
  degrees: string[];
  awards: string[];
  hospital?: string | null | undefined;
  location?: string | null | undefined;
  chamberTimes: {
    [key: string]: string[];
  };
  consultationFee?: string | null | undefined;
  languages: string[];
  services: string[];
  bio?: string | null | undefined;
}


const DoctorProfile: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileData, setProfileData] = useState<DoctorProfileData>({
    department: '',
    experience: 0,
    education: '',
    certifications: '',
    degrees: [],
    awards: [],
    hospital: '',
    location: '',
    chamberTimes: {},
    consultationFee: '',
    languages: ['English', 'Bengali'],
    services: [],
    bio: ''
  });

  const [newDegree, setNewDegree] = useState('');
  const [newAward, setNewAward] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [newService, setNewService] = useState('');

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: profileData
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = [
    '09:00-12:00', '14:00-17:00', '19:00-22:00'
  ];

  // Common medical degrees
  const commonDegrees = [
    'MBBS', 'MD', 'MS', 'FCPS', 'MCPS', 'MRCP', 'FRCS', 'DDV', 'DCH', 'DGO', 'DLO', 'DMRD', 'DMRT', 'DCP', 'DPM', 'DPMR', 'DPM', 'DPMR', 'DPM', 'DPMR'
  ];

  // Common medical services
  const commonServices = [
    'General Consultation', 'Emergency Care', 'Surgery', 'Diagnostic Tests', 'Vaccination', 'Health Checkup', 'Follow-up Care', 'Telemedicine', 'Home Visit', 'Second Opinion'
  ];

  // Common languages
  const commonLanguages = [
    'English', 'Bengali', 'Hindi', 'Arabic', 'Urdu', 'French', 'Spanish', 'German', 'Chinese', 'Japanese'
  ];

  // Fetch doctor profile data
  const fetchProfileData = async () => {
    try {
      const response = await axios.get('/doctors/profile');
      const data = response.data.data.doctor;
      setProfileData({
        profileImage: data.profileImage || '',
        bmdcRegistrationNumber: data.bmdcRegistrationNumber || '',
        department: data.department || '',
        experience: data.experience || 0,
        education: data.education || '',
        certifications: data.certifications || '',
        degrees: data.degrees || [],
        awards: data.awards || [],
        hospital: data.hospital || '',
        location: data.location || '',
        chamberTimes: data.chamberTimes || {},
        consultationFee: data.consultationFee ? data.consultationFee.toString() : '',
        languages: data.languages || ['English', 'Bengali'],
        services: data.services || [],
        bio: data.bio || ''
      });
      
      // Set form values
      setValue('department', data.department || '');
      setValue('experience', data.experience || 0);
      setValue('education', data.education || '');
      setValue('certifications', data.certifications || '');
      setValue('hospital', data.hospital || '');
      setValue('location', data.location || '');
      setValue('consultationFee', data.consultationFee ? data.consultationFee.toString() : '');
      setValue('bio', data.bio || '');
    } catch (error) {
      console.error('Failed to fetch doctor profile:', error);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Handle form submission
  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const updateData = {
        ...data,
        bmdcRegistrationNumber: profileData.bmdcRegistrationNumber,
        degrees: profileData.degrees,
        awards: profileData.awards,
        chamberTimes: profileData.chamberTimes,
        languages: profileData.languages,
        services: profileData.services,
        profileImage: profileData.profileImage
      };

      await axios.put('/doctors/profile', updateData);
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      await fetchProfileData();
    } catch (error: any) {
      console.error('Update error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Add degree
  const addDegree = () => {
    if (newDegree.trim() && !profileData.degrees.includes(newDegree.trim())) {
      setProfileData(prev => ({
        ...prev,
        degrees: [...prev.degrees, newDegree.trim()]
      }));
      setNewDegree('');
    }
  };

  // Remove degree
  const removeDegree = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      degrees: prev.degrees.filter((_, i) => i !== index)
    }));
  };

  // Add award
  const addAward = () => {
    if (newAward.trim() && !profileData.awards.includes(newAward.trim())) {
      setProfileData(prev => ({
        ...prev,
        awards: [...prev.awards, newAward.trim()]
      }));
      setNewAward('');
    }
  };

  // Remove award
  const removeAward = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      awards: prev.awards.filter((_, i) => i !== index)
    }));
  };

  // Add language
  const addLanguage = () => {
    if (newLanguage.trim() && !profileData.languages.includes(newLanguage.trim())) {
      setProfileData(prev => ({
        ...prev,
        languages: [...prev.languages, newLanguage.trim()]
      }));
      setNewLanguage('');
    }
  };

  // Remove language
  const removeLanguage = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index)
    }));
  };

  // Add service
  const addService = () => {
    if (newService.trim() && !profileData.services.includes(newService.trim())) {
      setProfileData(prev => ({
        ...prev,
        services: [...prev.services, newService.trim()]
      }));
      setNewService('');
    }
  };

  // Remove service
  const removeService = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  // Toggle chamber time
  const toggleChamberTime = (day: string, timeSlot: string) => {
    setProfileData(prev => {
      const currentTimes = prev.chamberTimes[day] || [];
      const newTimes = currentTimes.includes(timeSlot)
        ? currentTimes.filter(t => t !== timeSlot)
        : [...currentTimes, timeSlot];
      
      return {
        ...prev,
        chamberTimes: {
          ...prev.chamberTimes,
          [day]: newTimes
        }
      };
    });
  };

  // Handle image upload
  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPG, PNG, GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('profileImage', file);

      // Upload file to server
      const response = await axios.post('/doctors/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Update profile data with the uploaded image URL
        setProfileData(prev => ({
          ...prev,
          profileImage: response.data.data.imageUrl
        }));
        
        // Update user context with the new profile image
        if (response.data.data.imageUrl) {
          // Refresh user data to get updated profile image
          const userResponse = await axios.get('/auth/profile');
          if (userResponse.data.success) {
            // Update the user context
            window.location.reload(); // Simple refresh to update user context
          }
        }
        
        toast.success('Image uploaded successfully!');
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="page-header">Doctor Profile</h1>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="btn-primary"
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Image Section */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Image</h3>
            <div className="text-center">
              {profileData.profileImage ? (
                <img
                  src={`http://localhost:5000${profileData.profileImage}`}
                  alt="Profile"
                  className="h-32 w-32 rounded-full object-cover mx-auto mb-4"
                />
              ) : (
                <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="h-16 w-16 text-gray-400" />
                </div>
              )}
              {isEditing && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button 
                    type="button"
                    onClick={handleImageUpload}
                    disabled={isUploading}
                    className="btn-outline flex items-center gap-2 mx-auto disabled:opacity-50"
                  >
                    <CameraIcon className="h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Profile Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              
              {/* BMDC Registration Number - Display Only */}
              {profileData?.bmdcRegistrationNumber && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <label className="block text-sm font-medium text-blue-800 mb-1">BMDC Registration Number</label>
                  <p className="text-blue-900 font-semibold">{profileData.bmdcRegistrationNumber}</p>
                  <p className="text-xs text-blue-600 mt-1">This is your unique BMDC registration identifier and cannot be changed.</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medical Department</label>
                  {isEditing ? (
                    <select
                      {...register('department')}
                      className={`w-full px-3 py-2 border ${
                        errors.department ? 'border-red-300' : 'border-gray-300'
                      } rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    >
                      <option value="">Select Department</option>
                      {MEDICAL_DEPARTMENTS.map((dept) => (
                        <option key={dept.value} value={dept.value}>
                          {dept.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900">{getDepartmentLabel(profileData.department || '') || 'Not provided'}</p>
                  )}
                  {errors.department && (
                    <p className="mt-1 text-sm text-red-600">{errors.department.message as string}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                  {isEditing ? (
                    <input
                      {...register('experience')}
                      type="number"
                      min="0"
                      max="50"
                      className={`w-full px-3 py-2 border ${
                        errors.experience ? 'border-red-300' : 'border-gray-300'
                      } rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                      placeholder="Enter years of experience"
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.experience || 'Not provided'} years</p>
                  )}
                  {errors.experience && (
                    <p className="mt-1 text-sm text-red-600">{errors.experience.message as string}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Education</label>
                  {isEditing ? (
                    <input
                      {...register('education')}
                      className={`w-full px-3 py-2 border ${
                        errors.education ? 'border-red-300' : 'border-gray-300'
                      } rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                      placeholder="Enter education details"
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.education || 'Not provided'}</p>
                  )}
                  {errors.education && (
                    <p className="mt-1 text-sm text-red-600">{errors.education.message as string}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
                  {isEditing ? (
                    <input
                      {...register('certifications')}
                      className={`w-full px-3 py-2 border ${
                        errors.certifications ? 'border-red-300' : 'border-gray-300'
                      } rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                      placeholder="Enter certifications"
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.certifications || 'Not provided'}</p>
                  )}
                  {errors.certifications && (
                    <p className="mt-1 text-sm text-red-600">{errors.certifications.message as string}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hospital/Clinic Name</label>
                  {isEditing ? (
                    <input
                      {...register('hospital')}
                      className={`w-full px-3 py-2 border ${
                        errors.hospital ? 'border-red-300' : 'border-gray-300'
                      } rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                      placeholder="Enter hospital name"
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.hospital || 'Not provided'}</p>
                  )}
                  {errors.hospital && (
                    <p className="mt-1 text-sm text-red-600">{errors.hospital.message as string}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee (BDT)</label>
                  {isEditing ? (
                    <input
                      {...register('consultationFee')}
                      type="number"
                      className={`w-full px-3 py-2 border ${
                        errors.consultationFee ? 'border-red-300' : 'border-gray-300'
                      } rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                      placeholder="Enter consultation fee"
                    />
                  ) : (
                    <p className="text-gray-900">{profileData.consultationFee ? formatCurrency(parseFloat(profileData.consultationFee)) : 'Not set'}</p>
                  )}
                  {errors.consultationFee && (
                    <p className="mt-1 text-sm text-red-600">{errors.consultationFee.message as string}</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                {isEditing ? (
                  <input
                    {...register('location')}
                    className={`w-full px-3 py-2 border ${
                      errors.location ? 'border-red-300' : 'border-gray-300'
                    } rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="Enter hospital address"
                  />
                ) : (
                  <p className="text-gray-900">{profileData.location || 'Not provided'}</p>
                )}
                {errors.location && (
                  <p className="mt-1 text-sm text-red-600">{errors.location.message as string}</p>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                {isEditing ? (
                  <textarea
                    {...register('bio')}
                    rows={3}
                    className={`w-full px-3 py-2 border ${
                      errors.bio ? 'border-red-300' : 'border-gray-300'
                    } rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="Tell patients about yourself"
                  />
                ) : (
                  <p className="text-gray-900">{profileData.bio || 'No bio provided'}</p>
                )}
                {errors.bio && (
                  <p className="mt-1 text-sm text-red-600">{errors.bio.message as string}</p>
                )}
              </div>
            </div>

            {/* Chamber Times */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2" />
                Chamber Times
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {days.map(day => (
                  <div key={day} className="space-y-2">
                    <h4 className="font-medium text-gray-700">{day}</h4>
                    {timeSlots.map(timeSlot => (
                      <label key={timeSlot} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={profileData.chamberTimes[day]?.includes(timeSlot) || false}
                          onChange={() => toggleChamberTime(day, timeSlot)}
                          disabled={!isEditing}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{timeSlot}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Degrees */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <AcademicCapIcon className="h-5 w-5 mr-2" />
                Degrees & Qualifications
              </h3>
              <div className="space-y-3">
                {profileData.degrees.map((degree, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <span className="text-gray-900">{degree}</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => removeDegree(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDegree}
                        onChange={(e) => setNewDegree(e.target.value)}
                        placeholder="Add degree (e.g., MBBS, MD)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      <button
                        type="button"
                        onClick={addDegree}
                        className="btn-primary flex items-center gap-1"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p className="mb-2">Common degrees:</p>
                      <div className="flex flex-wrap gap-2">
                        {commonDegrees.map((degree) => (
                          <button
                            key={degree}
                            type="button"
                            onClick={() => setNewDegree(degree)}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                          >
                            {degree}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Awards */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <TrophyIcon className="h-5 w-5 mr-2" />
                Awards & Recognitions
              </h3>
              <div className="space-y-3">
                {profileData.awards.map((award, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <span className="text-gray-900">{award}</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => removeAward(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAward}
                      onChange={(e) => setNewAward(e.target.value)}
                      placeholder="Add award or recognition"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      type="button"
                      onClick={addAward}
                      className="btn-primary flex items-center gap-1"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Languages */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Languages</h3>
              <div className="space-y-3">
                {profileData.languages.map((language, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <span className="text-gray-900">{language}</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => removeLanguage(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newLanguage}
                        onChange={(e) => setNewLanguage(e.target.value)}
                        placeholder="Add language"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      <button
                        type="button"
                        onClick={addLanguage}
                        className="btn-primary flex items-center gap-1"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p className="mb-2">Common languages:</p>
                      <div className="flex flex-wrap gap-2">
                        {commonLanguages.map((language) => (
                          <button
                            key={language}
                            type="button"
                            onClick={() => setNewLanguage(language)}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                          >
                            {language}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Services */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Services</h3>
              <div className="space-y-3">
                {profileData.services.map((service, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <span className="text-gray-900">{service}</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => removeService(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newService}
                        onChange={(e) => setNewService(e.target.value)}
                        placeholder="Add medical service"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      <button
                        type="button"
                        onClick={addService}
                        className="btn-primary flex items-center gap-1"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p className="mb-2">Common services:</p>
                      <div className="flex flex-wrap gap-2">
                        {commonServices.map((service) => (
                          <button
                            key={service}
                            type="button"
                            onClick={() => setNewService(service)}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                          >
                            {service}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;
