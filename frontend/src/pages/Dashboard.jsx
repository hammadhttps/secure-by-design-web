import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Welcome{user?.username ? `, ${user.username}` : ''}!
        </h1>
        <p className="text-gray-600">
          Use the links below to manage your account and posts securely.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to="/posts"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Posts
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

