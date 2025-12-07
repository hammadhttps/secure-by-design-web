import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { postSchema, sanitizeInput } from '../utils/security';
import DOMPurify from 'dompurify';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { csrfToken } = useAuth();

  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    reset 
  } = useForm({
    resolver: zodResolver(postSchema)
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get('/api/posts', {
        withCredentials: true
      });
      
      // The backend returns { posts: [...], pagination: {...} }
      const postsData = response.data.posts || response.data || [];
      
      // Ensure postsData is an array
      if (!Array.isArray(postsData)) {
        console.error('Invalid posts data format:', response.data);
        setError('Invalid data format received from server');
        setPosts([]);
        return;
      }
      
      // Sanitize all post content before displaying
      const sanitizedPosts = postsData.map(post => ({
        ...post,
        title: DOMPurify.sanitize(post.title || ''),
        content: DOMPurify.sanitize(post.content || ''),
        username: post.username ? DOMPurify.sanitize(post.username) : 'Unknown'
      }));
      
      setPosts(sanitizedPosts);
      setError(''); // Clear any previous errors
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      
      // Provide more specific error messages
      if (error.response?.status === 401) {
        setError('You must be logged in to view posts');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view posts');
      } else if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to load posts. Please try again later.');
      }
      setPosts([]);
    }
  };

  const onSubmit = async (data) => {
    setError('');
    setSuccess('');

    try {
      // Sanitize input before sending (additional layer of security)
      const sanitizedData = {
        title: sanitizeInput(data.title),
        content: sanitizeInput(data.content)
      };

      await axios.post('/api/posts', sanitizedData, {
        headers: { 'X-CSRF-Token': csrfToken },
        withCredentials: true
      });

      setSuccess('Post created successfully!');
      reset();
      fetchPosts(); // Refresh posts
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create post');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Create Post</h1>
        
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
        
        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-700">{success}</div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              {...register('title')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter post title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              {...register('content')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter post content"
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              HTML tags are not allowed for security reasons.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Post'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Posts</h2>
        {posts.length === 0 ? (
          <p className="text-gray-500">No posts yet. Be the first to post!</p>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {post.title}
                  </h3>
                  <span className="text-sm text-gray-500">
                    by {post.username}
                  </span>
                </div>
                <p className="text-gray-600 whitespace-pre-wrap">{post.content}</p>
                <div className="mt-2 text-sm text-gray-400">
                  {new Date(post.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Posts;