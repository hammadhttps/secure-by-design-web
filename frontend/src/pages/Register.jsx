import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { registerSchema } from '../utils/security';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import { formRateLimiter } from '../utils/security';

const Register = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();

  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    watch 
  } = useForm({
    resolver: zodResolver(registerSchema)
  });

  const password = watch('password', '');

  const onSubmit = async (data) => {
    if (!formRateLimiter.attempt('register')) {
      setRateLimited(true);
      setTimeout(() => setRateLimited(false), 60000);
      return;
    }

    setError('');
    setSuccess('');

    const result = await registerUser({
      username: data.username,
      email: data.email,
      password: data.password
    });

    if (result.success) {
      setSuccess('Registration successful! Redirecting...');
      setTimeout(() => navigate('/login'), 1800);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-10 space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <span className="text-blue-400 text-5xl drop-shadow">🛡️</span>
          </div>
          <h2 className="text-3xl font-bold text-white">Create Your Account</h2>
          <p className="mt-2 text-sm text-gray-300">
            Already registered?{' '}
            <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300 underline">
              Sign in
            </Link>
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-lg bg-red-600/20 border border-red-400 p-3 text-center">
            <p className="text-sm text-red-300 font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-600/20 border border-green-400 p-3 text-center">
            <p className="text-sm text-green-300 font-medium">{success}</p>
          </div>
        )}

        {rateLimited && (
          <div className="rounded-lg bg-yellow-600/20 border border-yellow-400 p-3 text-center">
            <p className="text-sm text-yellow-200 font-medium">
              Too many attempts. Try again in 1 minute.
            </p>
          </div>
        )}

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          
          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1">
              Username
            </label>
            <input
              {...register('username')}
              type="text"
              placeholder="Enter username"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white 
                         placeholder-gray-300 focus:ring-4 focus:ring-blue-500/50 
                         focus:border-blue-400 transition-all"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-300">{errors.username.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1">
              Email Address
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white 
                         placeholder-gray-300 focus:ring-4 focus:ring-blue-500/50 
                         focus:border-blue-400 transition-all"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-300">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white 
                           placeholder-gray-300 focus:ring-4 focus:ring-blue-500/50 
                           focus:border-blue-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-4 text-gray-300 hover:text-white"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {errors.password && (
              <p className="mt-1 text-sm text-red-300">{errors.password.message}</p>
            )}

            <PasswordStrengthMeter password={password} />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1">
              Confirm Password
            </label>
            <input
              {...register('confirmPassword')}
              type="password"
              placeholder="Confirm password"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white 
                         placeholder-gray-300 focus:ring-4 focus:ring-blue-500/50 
                         focus:border-blue-400 transition-all"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-300">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || rateLimited}
            className="w-full py-3 rounded-lg text-white font-semibold bg-gradient-to-r 
                       from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 
                       shadow-lg shadow-blue-900/30 focus:ring-4 focus:ring-blue-600/50 
                       disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </button>

        </form>
      </div>
    </div>
  );
};

export default Register;
