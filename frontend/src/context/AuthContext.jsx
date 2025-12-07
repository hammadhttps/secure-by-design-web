import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState('');

  // Configure axios defaults
  axios.defaults.withCredentials = true;

  useEffect(() => {
    // Fetch CSRF token on mount
    fetchCsrfToken();
    checkAuth();
  }, []);

  const fetchCsrfToken = async () => {
    try {
      const response = await axios.get('/api/csrf-token', {
        withCredentials: true
      });
      setCsrfToken(response.data.csrfToken);
      // Set default CSRF token for axios
      axios.defaults.headers.common['X-CSRF-Token'] = response.data.csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  };

  const checkAuth = async () => {
    try {
      // Check if user is authenticated by trying to access a protected endpoint
      const response = await axios.get('/api/posts', {
        withCredentials: true
      });
      // If we get here, user is authenticated
      setUser({ id: 1, username: 'Authenticated User' }); // Replace with actual user data
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/login', 
        { email, password },
        { 
          withCredentials: true,
          headers: { 'X-CSRF-Token': csrfToken }
        }
      );
      setUser(response.data.user);
      await fetchCsrfToken(); // Get new CSRF token after login
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      // Ensure we have a CSRF token before making the request
      let token = csrfToken;
      if (!token) {
        // Fetch token directly to get the value immediately
        const tokenResponse = await axios.get('/api/csrf-token', {
          withCredentials: true
        });
        token = tokenResponse.data.csrfToken;
        setCsrfToken(token);
        axios.defaults.headers.common['X-CSRF-Token'] = token;
      }

      const response = await axios.post('/api/register', 
        userData,
        { 
          withCredentials: true,
          headers: { 'X-CSRF-Token': token }
        }
      );
      return { success: true };
    } catch (error) {
      // If CSRF token error, try to fetch a new token and retry once
      if (error.response?.status === 403 && 
          (error.response?.data?.error === 'Invalid CSRF token' || 
           error.response?.data?.message?.includes('CSRF'))) {
        try {
          // Fetch a fresh token
          const tokenResponse = await axios.get('/api/csrf-token', {
            withCredentials: true
          });
          const newToken = tokenResponse.data.csrfToken;
          setCsrfToken(newToken);
          axios.defaults.headers.common['X-CSRF-Token'] = newToken;
          
          // Retry the registration with the new token
          const retryResponse = await axios.post('/api/register', 
            userData,
            { 
              withCredentials: true,
              headers: { 'X-CSRF-Token': newToken }
            }
          );
          return { success: true };
        } catch (retryError) {
          return { 
            success: false, 
            error: retryError.response?.data?.error || retryError.response?.data?.message || 'Registration failed. Please refresh the page and try again.' 
          };
        }
      }
      return { 
        success: false, 
        error: error.response?.data?.error || error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/logout', {}, { withCredentials: true });
      setUser(null);
      setCsrfToken('');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      csrfToken,
      login,
      register,
      logout,
      fetchCsrfToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};