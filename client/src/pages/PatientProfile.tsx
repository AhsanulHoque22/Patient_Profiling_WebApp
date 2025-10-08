import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ChevronDownIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';


// Comprehensive list of common allergies
const COMMON_ALLERGIES = [
  // Food Allergies
  'Peanuts', 'Tree nuts', 'Shellfish', 'Fish', 'Eggs', 'Milk', 'Soy', 'Wheat', 'Sesame seeds',
  'Gluten', 'Lactose', 'Citrus fruits', 'Strawberries', 'Tomatoes', 'Chocolate', 'Sulfites',
  
  // Medication Allergies
  'Penicillin', 'Amoxicillin', 'Sulfonamides', 'NSAIDs (aspirin, ibuprofen)', 'Codeine', 
  'Morphine', 'Sulfasalazine', 'Tetracycline', 'Erythromycin', 'Vancomycin', 'Polymyxin',
  
  // Environmental Allergies
  'Pollen', 'Dust mites', 'Pet dander', 'Mold spores', 'Grass pollen', 'Tree pollen',
  'Weed pollen', 'Hay fever', 'Ragweed', 'Bee venom', 'Wasp venom', 'Ant venom',
  
  // Contact Allergies
  'Latex', 'Nickel', 'Parabens', 'Formaldehyde', 'Fragrances', 'Perfumes', 'Detergents',
  'Rubber', 'Leather', 'Metal jewelry', 'Cosmetics', 'Hair dyes', 'Fabric softeners',
  
  // Insect Allergies
  'Bee stings', 'Wasp stings', 'Ant bites', 'Mosquito bites', 'Tick bites', 'Flea bites',
  
  // Other Common Allergies
  'Insect repellent', 'Sunlight (photosensitivity)', 'Cold temperature', 'Heat',
  'Exercise-induced', 'Food additives', 'Artificial colors', 'Preservatives'
];


const PatientProfile: React.FC = () => {
  const { user } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingMedical, setIsEditingMedical] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Allergy management state
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [showAllergyDropdown, setShowAllergyDropdown] = useState(false);
  const [allergySearch, setAllergySearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Patient medical data state
  const [patientData, setPatientData] = useState({
    bloodType: '',
    allergies: '',
    emergencyContact: '',
    emergencyPhone: '',
    insuranceProvider: '',
    insuranceNumber: ''
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAllergyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch patient data on component mount
  const fetchPatientData = async () => {
    try {
      const response = await axios.get('/patients/profile');
      const data = response.data.data.patient;
      setPatientData({
        bloodType: data.bloodType || '',
        allergies: data.allergies || '',
        emergencyContact: data.emergencyContact || '',
        emergencyPhone: data.emergencyPhone || '',
        insuranceProvider: data.insuranceProvider || '',
        insuranceNumber: data.insuranceNumber || ''
      });
      
      // Parse allergies string into array for selected allergies display
      if (data.allergies) {
        setSelectedAllergies(data.allergies.split(', ').filter((a: string) => a.trim()));
      }
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
    }
  };

  useEffect(() => {
    fetchPatientData();
  }, []);

  const profileForm = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      dateOfBirth: user?.dateOfBirth || '',
      gender: user?.gender,
      address: user?.address || '',
    },
  });

  const medicalForm = useForm<{
    bloodType: string;
    allergies: string[];
    customAllergies: string;
    emergencyContact: string;
    emergencyPhone: string;
    insuranceProvider: string;
    insuranceNumber: string;
  }>({
    defaultValues: {
      bloodType: '',
      allergies: [] as string[],
      customAllergies: '',
      emergencyContact: '',
      emergencyPhone: '',
      insuranceProvider: '',
      insuranceNumber: ''
    },
  });

  // Filter allergies based on search
  const filteredAllergies = COMMON_ALLERGIES.filter(allergy =>
    allergy.toLowerCase().includes(allergySearch.toLowerCase()) &&
    !selectedAllergies.includes(allergy)
  );

  // Add allergy to selected list
  const addAllergy = (allergy: string) => {
    if (!selectedAllergies.includes(allergy)) {
      setSelectedAllergies([...selectedAllergies, allergy]);
      medicalForm.setValue('allergies', [...selectedAllergies, allergy]);
    }
    setAllergySearch('');
  };

  // Remove allergy from selected list
  const removeAllergy = (allergy: string) => {
    const updatedAllergies = selectedAllergies.filter(a => a !== allergy);
    setSelectedAllergies(updatedAllergies);
    medicalForm.setValue('allergies', updatedAllergies);
  };

  // Add custom allergy
  const addCustomAllergy = () => {
    if (customAllergy.trim() && !selectedAllergies.includes(customAllergy.trim())) {
      addAllergy(customAllergy.trim());
      setCustomAllergy('');
      medicalForm.setValue('customAllergies', '');
    }
  };

  const onSubmitProfile = async (data: any) => {
    setIsLoading(true);
    try {
      await axios.put('/auth/profile', data);
      toast.success('Profile updated successfully!');
      setIsEditingProfile(false);
      // The user context should refresh automatically
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitMedical = async (data: any) => {
    setIsLoading(true);
    try {
      // Prepare data for backend - convert allergies array to string
      const medicalData = {
        ...data,
        allergies: selectedAllergies.length > 0 ? selectedAllergies.join(', ') : ''
      };
      
      await axios.put('/patients/profile', medicalData);
      toast.success('Medical information updated successfully!');
      setIsEditingMedical(false);
      
      // Refresh patient data to show updated information
      await fetchPatientData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update medical information');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Patient Profile</h1>
        <p className="text-gray-600">Manage your personal information and medical details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
            {isEditingProfile ? (
              <form onSubmit={profileForm.handleSubmit(onSubmitProfile)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      {...profileForm.register('firstName')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                    {profileForm.formState.errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{profileForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      {...profileForm.register('lastName')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                    {profileForm.formState.errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{profileForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-500">{user?.email} (Cannot be changed)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      {...profileForm.register('phone')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <input
                      {...profileForm.register('dateOfBirth')}
                      type="date"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <select
                      {...profileForm.register('gender')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    {...profileForm.register('address')}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="mt-6 flex gap-3">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="btn-primary"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.firstName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.dateOfBirth || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{user?.gender || 'Not provided'}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-sm text-gray-900">{user?.address || 'Not provided'}</p>
                </div>
                <div className="mt-6">
                  <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="btn-primary"
                  >
                    Edit Profile
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Medical Information */}
        <div>
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Information</h3>
            {isEditingMedical ? (
              <form onSubmit={medicalForm.handleSubmit(onSubmitMedical)}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Blood Type</label>
                    <select
                      {...medicalForm.register('bloodType')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">Select Blood Type</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Allergies</label>
                    
                    {/* Selected Allergies Display */}
                    {selectedAllergies.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2 mb-3">
                        {selectedAllergies.map((allergy) => (
                          <span
                            key={allergy}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full"
                          >
                            {allergy}
                            <button
                              type="button"
                              onClick={() => removeAllergy(allergy)}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Allergy Search Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                      <div className="flex">
                        <input
                          type="text"
                          value={allergySearch}
                          onChange={(e) => setAllergySearch(e.target.value)}
                          onFocus={() => setShowAllergyDropdown(true)}
                          placeholder="Search or select allergies..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAllergyDropdown(!showAllergyDropdown)}
                          className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100"
                        >
                          <ChevronDownIcon className="h-4 w-4" />
                        </button>
                      </div>

                      {showAllergyDropdown && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredAllergies.length > 0 ? (
                            filteredAllergies.map((allergy) => (
                              <button
                                key={allergy}
                                type="button"
                                onClick={() => {
                                  addAllergy(allergy);
                                  setShowAllergyDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b border-gray-100"
                              >
                                {allergy}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              No matching allergies found
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Custom Allergy Input */}
                    <div className="mt-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Add Custom Allergy</div>
                      <div className="flex">
                        <input
                          type="text"
                          value={customAllergy}
                          onChange={(e) => {
                            setCustomAllergy(e.target.value);
                            medicalForm.setValue('customAllergies', e.target.value);
                          }}
                          placeholder="Enter custom allergy name..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                        <button
                          type="button"
                          onClick={addCustomAllergy}
                          disabled={!customAllergy.trim()}
                          className="px-3 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Emergency Contact Name</label>
                    <input
                      {...medicalForm.register('emergencyContact')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Emergency contact full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Emergency Contact Phone</label>
                    <input
                      {...medicalForm.register('emergencyPhone')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Emergency contact phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Insurance Provider</label>
                    <input
                      {...medicalForm.register('insuranceProvider')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Insurance company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Insurance Number</label>
                    <input
                      {...medicalForm.register('insuranceNumber')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Insurance policy number"
                    />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="flex-1 btn-primary"
                  >
                    {isLoading ? 'Saving...' : 'Save Medical Info'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEditingMedical(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Blood Type</label>
                    <p className="mt-1 text-sm text-gray-900">{patientData.bloodType || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Allergies</label>
                    {selectedAllergies.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {selectedAllergies.map((allergy) => (
                          <span
                            key={allergy}
                            className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full"
                          >
                            {allergy}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">None reported</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
                    <div className="mt-1 text-sm text-gray-900">
                      <p><strong>Name:</strong> {patientData.emergencyContact || 'Not provided'}</p>
                      <p><strong>Phone:</strong> {patientData.emergencyPhone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Insurance Information</label>
                    <div className="mt-1 text-sm text-gray-900">
                      <p><strong>Provider:</strong> {patientData.insuranceProvider || 'Not provided'}</p>
                      <p><strong>Policy Number:</strong> {patientData.insuranceNumber || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <button 
                    onClick={() => setIsEditingMedical(true)}
                    className="btn-primary w-full"
                  >
                    Update Medical Info
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
