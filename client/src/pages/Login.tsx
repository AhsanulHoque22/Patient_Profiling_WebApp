import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  HeartIcon, 
  ArrowRightIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
  UserGroupIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface LoginFormData {
  emailOrPhone: string;
  password: string;
}


const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/app';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      emailOrPhone: '',
      password: ''
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log('Login form submitted with data:', data);
    setIsLoading(true);
    try {
      await login(data.emailOrPhone, data.password);
      console.log('Login successful, navigating to:', from);
      // Small delay to ensure auth state is updated
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 100);
    } catch (error) {
      console.error('Login error:', error);
      // Error is handled in the auth context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-emerald-400/10 to-blue-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center group">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <HeartIcon className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">HealthCare Pro</span>
            </Link>
            <Link 
              to="/" 
              className="text-gray-600 hover:text-indigo-600 transition-colors font-medium flex items-center gap-2 group"
            >
              <span>Back to Home</span>
              <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-4rem)] relative z-10">
        {/* Left Side - Login Form */}
        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            {/* Login Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 p-8 relative overflow-hidden">
              {/* Card Background Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-blue-50/50"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-indigo-600/10 rounded-full blur-2xl"></div>
              
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <HeartIcon className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Welcome Back
                  </h2>
                  <p className="text-gray-600">
                    Sign in to access your healthcare dashboard
                  </p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-5">
                    <div>
                      <label htmlFor="emailOrPhone" className="block text-sm font-semibold text-gray-700 mb-3">
                        Email Address or Phone Number
                      </label>
                      <div className="relative">
                        <input
                          {...register('emailOrPhone', { 
                            required: 'Email or phone number is required',
                            validate: (value) => {
                              const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
                              const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
                              if (emailRegex.test(value) || phoneRegex.test(value)) {
                                return true;
                              }
                              return 'Please enter a valid email address or phone number';
                            }
                          })}
                          type="text"
                          autoComplete="username"
                          className={`w-full px-4 py-4 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/70 backdrop-blur-sm ${
                            errors.emailOrPhone ? 'border-red-400 bg-red-50/70' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          placeholder="Enter your email or phone number"
                        />
                      </div>
                      {errors.emailOrPhone && (
                        <p className="mt-3 text-sm text-red-600 flex items-center bg-red-50/70 rounded-lg px-3 py-2">
                          <span className="mr-2">⚠️</span>
                          {errors.emailOrPhone.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          {...register('password', { 
                            required: 'Password is required',
                            minLength: {
                              value: 6,
                              message: 'Password must be at least 6 characters'
                            }
                          })}
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          className={`w-full px-4 py-4 pr-12 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/70 backdrop-blur-sm ${
                            errors.password ? 'border-red-400 bg-red-50/70' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          placeholder="Enter your password"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-100/50 rounded-r-xl transition-colors duration-200"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-3 text-sm text-red-600 flex items-center bg-red-50/70 rounded-lg px-3 py-2">
                          <span className="mr-2">⚠️</span>
                          {errors.password.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-2 border-gray-300 rounded-lg transition-all duration-200"
                      />
                      <label htmlFor="remember-me" className="ml-3 block text-sm font-medium text-gray-700">
                        Remember me
                      </label>
                    </div>

                    <div className="text-sm">
                      <Link 
                        to="/forgot-password" 
                        className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors duration-200 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group relative w-full flex justify-center items-center py-4 px-6 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:via-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02] transform"
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                          <span className="text-lg">Signing in...</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="text-lg">Sign In</span>
                          <ArrowRightIcon className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform duration-200" />
                        </div>
                      )}
                    </button>
                  </div>

                  <div className="text-center pt-4 border-t border-gray-200/50">
                    <p className="text-sm text-gray-600">
                      Don't have an account?{' '}
                      <Link
                        to="/register"
                        className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors duration-200 hover:underline"
                      >
                        Create one here
                      </Link>
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Features/Benefits */}
        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-800/20 via-transparent to-indigo-800/20"></div>
          
          {/* Decorative Elements */}
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 left-20 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 max-w-md text-white p-8">
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <HeartIcon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-3xl font-bold">
                  Your Health, Simplified
                </h3>
              </div>
              <p className="text-blue-100 text-lg leading-relaxed">
                Access your complete healthcare ecosystem with just one login. Experience seamless, secure, and comprehensive health management.
              </p>
            </div>

            <div className="space-y-6">
              <div className="group flex items-start bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="bg-white/20 rounded-xl p-3 mr-4 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircleIcon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold mb-2 text-lg">Secure & Private</h4>
                  <p className="text-blue-100 text-sm leading-relaxed">
                    HIPAA compliant with enterprise-grade security and end-to-end encryption
                  </p>
                </div>
              </div>

              <div className="group flex items-start bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="bg-white/20 rounded-xl p-3 mr-4 group-hover:scale-110 transition-transform duration-300">
                  <ClockIcon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold mb-2 text-lg">24/7 Access</h4>
                  <p className="text-blue-100 text-sm leading-relaxed">
                    Access your health records, appointments, and prescriptions anytime, anywhere
                  </p>
                </div>
              </div>

              <div className="group flex items-start bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="bg-white/20 rounded-xl p-3 mr-4 group-hover:scale-110 transition-transform duration-300">
                  <UserGroupIcon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold mb-2 text-lg">Expert Care</h4>
                  <p className="text-blue-100 text-sm leading-relaxed">
                    Connect with verified healthcare professionals and specialists
                  </p>
                </div>
              </div>

              <div className="group flex items-start bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="bg-white/20 rounded-xl p-3 mr-4 group-hover:scale-110 transition-transform duration-300">
                  <ShieldCheckIcon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold mb-2 text-lg">Comprehensive</h4>
                  <p className="text-blue-100 text-sm leading-relaxed">
                    Everything you need for complete health management in one platform
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <StarIcon className="h-5 w-5 text-yellow-300" />
                </div>
                <p className="font-bold text-lg">
                  Trusted by Thousands
                </p>
              </div>
              <p className="text-blue-100 text-sm">
                Join over <strong>10,000+ patients</strong> and <strong>500+ healthcare providers</strong> who trust our platform
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
