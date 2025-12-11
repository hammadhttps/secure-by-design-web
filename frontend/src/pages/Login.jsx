import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { loginSchema } from '../utils/security';

const Login = () => {
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data) => {
    setError('');
    const result = await login(data.email, data.password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl shadow-2xl rounded-2xl p-10 border border-white/20 space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <span className="text-blue-400 text-5xl drop-shadow">🔐</span>
          </div>
          <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-300">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-blue-400 hover:text-blue-300 underline">
              Register here
            </Link>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-600/20 border border-red-400 p-3 text-center">
            <p className="text-sm text-red-300 font-medium">{error}</p>
          </div>
        )}

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1">
              Email Address
            </label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white
                         placeholder-gray-300 focus:ring-4 focus:ring-blue-500/50 focus:border-blue-400
                         transition-all"
              placeholder="you@example.com"
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
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white
                           placeholder-gray-300 focus:ring-4 focus:ring-blue-500/50 focus:border-blue-400
                           transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-4 flex items-center text-gray-300 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-300">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-blue-500 to-blue-700
                       hover:from-blue-600 hover:to-blue-800 shadow-lg shadow-blue-900/30
                       focus:ring-4 focus:ring-blue-600/50 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all"
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>

        </form>
      </div>
    </div>
  );
};

export default Login;
