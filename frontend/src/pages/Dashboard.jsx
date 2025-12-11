import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

const Dashboard = () => {
  const { user, logout, failedLoginAttempts, fetchFailedLoginAttempts } = useAuth();
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (user && fetchFailedLoginAttempts) {
      const timer = setTimeout(() => fetchFailedLoginAttempts(), 300);
      return () => clearTimeout(timer);
    }
  }, [user, fetchFailedLoginAttempts]);

  useEffect(() => {
    if (failedLoginAttempts?.length > 0) {
      const recentAttempts = getRecentAttempts();
      if (recentAttempts.length > 0) setShowNotification(true);
    } else {
      setShowNotification(false);
    }
  }, [failedLoginAttempts]);

  const handleLogout = async () => {
    await logout();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleString();
  };

  const getRecentAttempts = () => {
    if (!failedLoginAttempts) return [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return failedLoginAttempts.filter(a => new Date(a.attemptTime) > oneDayAgo);
  };

  const recentAttempts = getRecentAttempts();

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 text-gray-100">

      {/* SECURITY ALERT */}
      {showNotification && recentAttempts.length > 0 && (
        <div className="bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-xl shadow-xl backdrop-blur-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                />
              </svg>
            </div>

            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-yellow-300">
                Security Alert: Failed Login Attempts Detected
              </h3>

              <p className="mt-2 text-sm text-yellow-200">
                We detected {recentAttempts.length} failed login attempt
                {recentAttempts.length !== 1 && 's'} in the last 24 hours.
              </p>

              <div className="mt-3 space-y-1 text-yellow-100">
                <p className="font-semibold text-yellow-300">Recent attempts:</p>
                <ul className="list-disc list-inside space-y-1">
                  {recentAttempts.slice(0, 3).map(a => (
                    <li key={a.id} className="text-sm">
                      IP: {a.ipAddress} — {formatDate(a.attemptTime)}
                    </li>
                  ))}
                </ul>

                {recentAttempts.length > 3 && (
                  <p className="text-xs text-yellow-400">
                    ...and {recentAttempts.length - 3} more attempts
                  </p>
                )}
              </div>

              <p className="mt-3 text-xs text-yellow-300">
                If these aren’t your attempts, consider changing your password immediately.
              </p>

              <button
                onClick={() => setShowNotification(false)}
                className="mt-4 text-sm font-medium text-yellow-300 hover:text-yellow-200 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="bg-[#0f0f14]/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl p-6">
        <h1 className="text-3xl font-bold text-indigo-300 mb-2">
          Welcome{user?.username ? `, ${user.username}` : ''}!
        </h1>

        <p classnmae="text-gray-400">
          Manage your account and posts with confidence.
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            to="/posts"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium shadow-md"
          >
            Go to Posts
          </Link>

          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-white/20 rounded-lg hover:bg-white/10 text-gray-200"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
